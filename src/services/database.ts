/**
 * Offline-first data layer (Chapter 9.10).
 * All records are written to the encrypted-at-rest local SQLite database first
 * and flagged `pending` until the Sync Manager confirms cloud replication.
 */
import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('mamavr.db');

export function initDatabase(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      district TEXT NOT NULL DEFAULT '',
      region TEXT NOT NULL DEFAULT '',
      logo_uri TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      facility_id TEXT REFERENCES facilities(id),
      avatar_uri TEXT,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      facility_id TEXT REFERENCES facilities(id),
      photo_uri TEXT,
      full_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      emergency_contact_name TEXT NOT NULL DEFAULT '',
      emergency_contact_phone TEXT NOT NULL DEFAULT '',
      national_id TEXT,
      nhis_number TEXT,
      gravidity INTEGER,
      parity INTEGER,
      lmp TEXT,
      medical_history TEXT NOT NULL DEFAULT '{}',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS anc_visits (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      visit_date TEXT NOT NULL,
      gestational_age_weeks INTEGER,
      vitals TEXT NOT NULL DEFAULT '{}',
      symptoms TEXT NOT NULL DEFAULT '[]',
      fetal TEXT NOT NULL DEFAULT '{}',
      labs TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL REFERENCES anc_visits(id),
      patient_id TEXT NOT NULL REFERENCES patients(id),
      overall_risk TEXT NOT NULL,
      findings TEXT NOT NULL DEFAULT '[]',
      missing_data TEXT NOT NULL DEFAULT '[]',
      confidence INTEGER NOT NULL,
      recommended_vr_module_id TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      visit_id TEXT,
      assessment_id TEXT,
      reason TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      referral_date TEXT NOT NULL,
      receiving_facility TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      created_by TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      visit_id TEXT,
      due_date TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT 'Routine ANC',
      status TEXT NOT NULL DEFAULT 'scheduled'
    );

    CREATE TABLE IF NOT EXISTS vr_modules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT '',
      key_messages TEXT NOT NULL DEFAULT '[]',
      duration_minutes INTEGER NOT NULL DEFAULT 5,
      video_uri TEXT,
      thumbnail_uri TEXT,
      languages TEXT NOT NULL DEFAULT '["en"]',
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vr_sessions (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL REFERENCES vr_modules(id),
      patient_id TEXT,
      visit_id TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      completed INTEGER NOT NULL DEFAULT 0,
      progress_percent INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      uri TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT '',
      owner_type TEXT NOT NULL,
      owner_id TEXT,
      size_bytes INTEGER,
      uploaded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT NOT NULL DEFAULT '',
      facility_id TEXT,
      action TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      device_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
    CREATE INDEX IF NOT EXISTS idx_visits_patient ON anc_visits(patient_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);
}

export function getSetting(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.runSync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}
