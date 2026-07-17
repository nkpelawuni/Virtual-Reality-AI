/**
 * Audit trail (Chapter 3.3 / 10.8): every significant activity is recorded
 * with user, facility, timestamp, device and action.
 */
import * as Crypto from 'expo-crypto';

import { AuditLog, User } from '@/types';
import { db, getSetting, nowIso, setSetting } from './database';

let deviceId: string | null = null;

export function getDeviceId(): string {
  if (deviceId) return deviceId;
  const stored = getSetting('device_id');
  if (stored) {
    deviceId = stored;
    return stored;
  }
  const fresh = Crypto.randomUUID();
  setSetting('device_id', fresh);
  deviceId = fresh;
  return fresh;
}

export function logAudit(user: User | null, action: string, detail = ''): void {
  db.runSync(
    `INSERT INTO audit_logs (id, user_id, username, facility_id, action, detail, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Crypto.randomUUID(),
      user?.id ?? null,
      user?.username ?? 'system',
      user?.facilityId ?? null,
      action,
      detail,
      getDeviceId(),
      nowIso(),
    ]
  );
}

interface AuditRow {
  id: string;
  user_id: string | null;
  username: string;
  facility_id: string | null;
  action: string;
  detail: string;
  device_id: string;
  created_at: string;
}

export function listAuditLogs(limit = 100): AuditLog[] {
  const rows = db.getAllSync<AuditRow>(
    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username,
    facilityId: row.facility_id,
    action: row.action,
    detail: row.detail,
    deviceId: row.device_id,
    createdAt: row.created_at,
  }));
}
