/**
 * Media Manager — central service for every image, logo and video upload
 * in MamaVR AI. Handles:
 *   - patient photographs (registration / search results)
 *   - facility logos (facility management)
 *   - application branding logo (administrator settings)
 *   - healthcare worker avatars (profile)
 *   - VR education videos and thumbnails (VR content management)
 *
 * Files picked from the camera or library are copied into the app's private
 * document storage so they survive cache eviction, then registered in the
 * `media_assets` table with `uploaded = 0` so the Sync Manager can push them
 * to cloud file storage (Supabase Storage / Firebase Storage) when online.
 */
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { MediaAsset, MediaKind, MediaOwnerType } from '@/types';
import { db, nowIso } from './database';

const MEDIA_DIR = `${FileSystem.documentDirectory ?? ''}media/`;

async function ensureMediaDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MEDIA_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
  }
}

function extensionFor(uri: string, kind: MediaKind): string {
  const match = /\.(\w{2,5})(\?.*)?$/.exec(uri);
  if (match) return match[1].toLowerCase();
  return kind === 'video' ? 'mp4' : 'jpg';
}

function mimeFor(extension: string, kind: MediaKind): string {
  if (kind === 'video') {
    return extension === 'mov' ? 'video/quicktime' : 'video/mp4';
  }
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Copies a picked file into permanent app storage and registers it in the
 * media library so it is queued for cloud upload. Returns the stored asset.
 */
export async function persistMedia(
  sourceUri: string,
  kind: MediaKind,
  ownerType: MediaOwnerType,
  ownerId: string | null
): Promise<MediaAsset> {
  await ensureMediaDir();
  const id = Crypto.randomUUID();
  const extension = extensionFor(sourceUri, kind);
  const destination = `${MEDIA_DIR}${ownerType}-${id}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });

  const info = await FileSystem.getInfoAsync(destination);
  const sizeBytes = info.exists && !info.isDirectory ? info.size ?? null : null;
  const asset: MediaAsset = {
    id,
    kind,
    uri: destination,
    mimeType: mimeFor(extension, kind),
    ownerType,
    ownerId,
    sizeBytes,
    uploaded: false,
    createdAt: nowIso(),
  };

  db.runSync(
    `INSERT INTO media_assets (id, kind, uri, mime_type, owner_type, owner_id, size_bytes, uploaded, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [asset.id, asset.kind, asset.uri, asset.mimeType, asset.ownerType, asset.ownerId, asset.sizeBytes, asset.createdAt]
  );
  return asset;
}

/** Launches the photo library picker for an image and stores the selection. */
export async function pickImage(
  ownerType: MediaOwnerType,
  ownerId: string | null,
  options?: { allowsEditing?: boolean; aspect?: [number, number] }
): Promise<MediaAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return persistMedia(result.assets[0].uri, 'image', ownerType, ownerId);
}

/** Captures an image with the camera and stores it. */
export async function takePhoto(
  ownerType: MediaOwnerType,
  ownerId: string | null
): Promise<MediaAsset | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return persistMedia(result.assets[0].uri, 'image', ownerType, ownerId);
}

/** Launches the library picker for a video (e.g. VR education content). */
export async function pickVideo(
  ownerType: MediaOwnerType,
  ownerId: string | null
): Promise<MediaAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return persistMedia(result.assets[0].uri, 'video', ownerType, ownerId);
}

interface MediaRow {
  id: string;
  kind: MediaKind;
  uri: string;
  mime_type: string;
  owner_type: MediaOwnerType;
  owner_id: string | null;
  size_bytes: number | null;
  uploaded: number;
  created_at: string;
}

function mapRow(row: MediaRow): MediaAsset {
  return {
    id: row.id,
    kind: row.kind,
    uri: row.uri,
    mimeType: row.mime_type,
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    sizeBytes: row.size_bytes,
    uploaded: row.uploaded === 1,
    createdAt: row.created_at,
  };
}

/** Assets not yet replicated to cloud storage — consumed by the Sync Manager. */
export function getPendingUploads(): MediaAsset[] {
  return db
    .getAllSync<MediaRow>('SELECT * FROM media_assets WHERE uploaded = 0 ORDER BY created_at')
    .map(mapRow);
}

export function markUploaded(assetId: string): void {
  db.runSync('UPDATE media_assets SET uploaded = 1 WHERE id = ?', [assetId]);
}

export function countPendingUploads(): number {
  const row = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM media_assets WHERE uploaded = 0'
  );
  return row?.n ?? 0;
}

/** Removes the file from disk and the library record (e.g. replaced logo). */
export async function deleteMedia(asset: MediaAsset): Promise<void> {
  db.runSync('DELETE FROM media_assets WHERE id = ?', [asset.id]);
  try {
    await FileSystem.deleteAsync(asset.uri, { idempotent: true });
  } catch {
    // File may already be gone; the library record is the source of truth.
  }
}
