/**
 * VR Learning Module content library and session tracking (Chapter 7 / 9.9).
 *
 * The module library ships with the six built-in lessons from §7.4. The MVP
 * renders each lesson as an immersive full-screen video experience compatible
 * with smartphone VR headsets; administrators upload the produced video and a
 * thumbnail for each module through the VR Content Manager (media uploads are
 * handled by the Media Manager service and queued for cloud sync).
 */
import * as Crypto from 'expo-crypto';

import { SyncStatus, User, VrLanguage, VrModule, VrSession } from '@/types';
import { logAudit } from './audit';
import { db, nowIso } from './database';

interface ModuleRow {
  id: string;
  title: string;
  purpose: string;
  key_messages: string;
  duration_minutes: number;
  video_uri: string | null;
  thumbnail_uri: string | null;
  languages: string;
  is_builtin: number;
  created_at: string;
}

function mapModule(row: ModuleRow): VrModule {
  return {
    id: row.id,
    title: row.title,
    purpose: row.purpose,
    keyMessages: JSON.parse(row.key_messages) as string[],
    durationMinutes: row.duration_minutes,
    videoUri: row.video_uri,
    thumbnailUri: row.thumbnail_uri,
    languages: JSON.parse(row.languages) as VrLanguage[],
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
  };
}

export function listVrModules(): VrModule[] {
  return db.getAllSync<ModuleRow>('SELECT * FROM vr_modules ORDER BY is_builtin DESC, title').map(mapModule);
}

export function getVrModule(id: string): VrModule | null {
  const row = db.getFirstSync<ModuleRow>('SELECT * FROM vr_modules WHERE id = ?', [id]);
  return row ? mapModule(row) : null;
}

/** Admin: attach or replace the uploaded lesson video for a module. */
export function setModuleVideo(admin: User, moduleId: string, videoUri: string | null): void {
  db.runSync('UPDATE vr_modules SET video_uri = ? WHERE id = ?', [videoUri, moduleId]);
  logAudit(admin, 'VR_CONTENT_UPDATED', `Video ${videoUri ? 'uploaded' : 'removed'} for module ${moduleId}`);
}

/** Admin: attach or replace the uploaded thumbnail image for a module. */
export function setModuleThumbnail(admin: User, moduleId: string, thumbnailUri: string | null): void {
  db.runSync('UPDATE vr_modules SET thumbnail_uri = ? WHERE id = ?', [thumbnailUri, moduleId]);
  logAudit(admin, 'VR_CONTENT_UPDATED', `Thumbnail updated for module ${moduleId}`);
}

export interface NewModuleInput {
  title: string;
  purpose: string;
  keyMessages: string[];
  durationMinutes: number;
  videoUri: string | null;
  thumbnailUri: string | null;
}

/** Admin: publish an entirely new education module with uploaded media. */
export function createVrModule(admin: User, input: NewModuleInput): VrModule {
  const module: VrModule = {
    id: Crypto.randomUUID(),
    title: input.title.trim(),
    purpose: input.purpose.trim(),
    keyMessages: input.keyMessages,
    durationMinutes: input.durationMinutes,
    videoUri: input.videoUri,
    thumbnailUri: input.thumbnailUri,
    languages: ['en'],
    isBuiltin: false,
    createdAt: nowIso(),
  };
  db.runSync(
    `INSERT INTO vr_modules (id, title, purpose, key_messages, duration_minutes, video_uri, thumbnail_uri, languages, is_builtin, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      module.id,
      module.title,
      module.purpose,
      JSON.stringify(module.keyMessages),
      module.durationMinutes,
      module.videoUri,
      module.thumbnailUri,
      JSON.stringify(module.languages),
      module.createdAt,
    ]
  );
  logAudit(admin, 'VR_CONTENT_CREATED', `New VR module: ${module.title}`);
  return module;
}

export function startVrSession(
  user: User,
  moduleId: string,
  patientId: string | null,
  visitId: string | null,
  language: VrLanguage
): VrSession {
  const session: VrSession = {
    id: Crypto.randomUUID(),
    moduleId,
    patientId,
    visitId,
    language,
    completed: false,
    progressPercent: 0,
    startedAt: nowIso(),
    endedAt: null,
    syncStatus: 'pending',
  };
  db.runSync(
    `INSERT INTO vr_sessions (id, module_id, patient_id, visit_id, language, completed, progress_percent, started_at, ended_at, sync_status)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?, NULL, 'pending')`,
    [session.id, session.moduleId, session.patientId, session.visitId, session.language, session.startedAt]
  );
  logAudit(user, 'VR_LAUNCHED', `Module ${moduleId} (${language})`);
  return session;
}

export function updateVrSession(sessionId: string, progressPercent: number, completed: boolean): void {
  db.runSync(
    `UPDATE vr_sessions SET progress_percent = ?, completed = ?, ended_at = ?, sync_status = 'pending' WHERE id = ?`,
    [Math.round(progressPercent), completed ? 1 : 0, completed ? nowIso() : null, sessionId]
  );
}

export function countVrSessions(): number {
  const row = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM vr_sessions');
  return row?.n ?? 0;
}

export function hasCompletedVrSession(visitId: string): boolean {
  const row = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM vr_sessions WHERE visit_id = ? AND completed = 1',
    [visitId]
  );
  return (row?.n ?? 0) > 0;
}
