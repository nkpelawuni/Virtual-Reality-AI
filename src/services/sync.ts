/**
 * Sync Manager (Chapter 9.10): offline-first cloud synchronization.
 *
 * Every clinical record and uploaded media file is stored locally first and
 * flagged `pending`. When connectivity is available, `syncNow` pushes pending
 * records to the configured cloud backend and marks them `synced`.
 *
 * The MVP ships with a pluggable backend: when EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_ANON_KEY are configured, records are POSTed to the
 * Supabase REST endpoints and media files are uploaded to Supabase Storage.
 * Without configuration the manager operates in local mode and reports the
 * pending queue without transmitting anything.
 */
import { User } from '@/types';
import { logAudit } from './audit';
import { db } from './database';
import { countPendingUploads, getPendingUploads, markUploaded } from './media';

const SYNCABLE_TABLES = ['patients', 'anc_visits', 'assessments', 'referrals', 'vr_sessions'] as const;

export interface SyncStatusSummary {
  pendingRecords: number;
  pendingMedia: number;
  cloudConfigured: boolean;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export function isCloudConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

export function getSyncStatus(): SyncStatusSummary {
  let pendingRecords = 0;
  for (const table of SYNCABLE_TABLES) {
    const row = db.getFirstSync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${table} WHERE sync_status = 'pending'`
    );
    pendingRecords += row?.n ?? 0;
  }
  return {
    pendingRecords,
    pendingMedia: countPendingUploads(),
    cloudConfigured: isCloudConfigured(),
  };
}

async function pushTable(table: string): Promise<number> {
  const rows = db.getAllSync<Record<string, unknown>>(
    `SELECT * FROM ${table} WHERE sync_status = 'pending'`
  );
  if (rows.length === 0) return 0;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY as string,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows.map(({ sync_status: _ignored, ...rest }) => rest)),
  });
  if (!response.ok) {
    throw new Error(`Sync failed for ${table}: HTTP ${response.status}`);
  }
  db.runSync(`UPDATE ${table} SET sync_status = 'synced' WHERE sync_status = 'pending'`);
  return rows.length;
}

async function pushMedia(): Promise<number> {
  const assets = getPendingUploads();
  let pushed = 0;
  for (const asset of assets) {
    const fileName = asset.uri.split('/').pop() ?? `${asset.id}`;
    const body = new FormData();
    body.append('file', {
      uri: asset.uri,
      name: fileName,
      type: asset.mimeType,
    } as unknown as Blob);
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/media/${asset.ownerType}/${fileName}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body,
      }
    );
    if (!response.ok) {
      throw new Error(`Media upload failed: HTTP ${response.status}`);
    }
    markUploaded(asset.id);
    pushed += 1;
  }
  return pushed;
}

export type SyncResult =
  | { ok: true; recordsSynced: number; mediaSynced: number }
  | { ok: false; error: string };

export async function syncNow(user: User): Promise<SyncResult> {
  const status = getSyncStatus();
  if (status.pendingRecords === 0 && status.pendingMedia === 0) {
    return { ok: true, recordsSynced: 0, mediaSynced: 0 };
  }
  if (!isCloudConfigured()) {
    return {
      ok: false,
      error:
        'Cloud synchronization is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable secure sync. Your records remain safely stored on this device.',
    };
  }
  try {
    let recordsSynced = 0;
    for (const table of SYNCABLE_TABLES) {
      recordsSynced += await pushTable(table);
    }
    const mediaSynced = await pushMedia();
    logAudit(user, 'DATA_SYNCHRONIZED', `${recordsSynced} records, ${mediaSynced} media files`);
    return { ok: true, recordsSynced, mediaSynced };
  } catch (error) {
    logAudit(user, 'SYNC_FAILED', error instanceof Error ? error.message : 'Unknown error');
    return {
      ok: false,
      error:
        'Synchronization failed. Please try again when internet connectivity is available. Your records remain safely stored on this device.',
    };
  }
}
