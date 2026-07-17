/** ANC visit recording (Chapter 4.7) and consultation persistence. */
import * as Crypto from 'expo-crypto';

import {
  AncVisit,
  FetalAssessment,
  LabResults,
  SymptomKey,
  SyncStatus,
  User,
  VisitStatus,
  VitalSigns,
} from '@/types';
import { logAudit } from './audit';
import { db, nowIso } from './database';
import { toIsoDate } from '@/utils/calculations';

interface VisitRow {
  id: string;
  patient_id: string;
  visit_date: string;
  gestational_age_weeks: number | null;
  vitals: string;
  symptoms: string;
  fetal: string;
  labs: string;
  status: VisitStatus;
  created_by: string;
  created_at: string;
  sync_status: SyncStatus;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapVisit(row: VisitRow): AncVisit {
  return {
    id: row.id,
    patientId: row.patient_id,
    visitDate: row.visit_date,
    gestationalAgeWeeks: row.gestational_age_weeks,
    vitals: parseJson<VitalSigns>(row.vitals, {}),
    symptoms: parseJson<SymptomKey[]>(row.symptoms, []),
    fetal: parseJson<FetalAssessment>(row.fetal, {}),
    labs: parseJson<LabResults>(row.labs, {}),
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    syncStatus: row.sync_status,
  };
}

export interface VisitInput {
  patientId: string;
  gestationalAgeWeeks: number | null;
  vitals: VitalSigns;
  symptoms: SymptomKey[];
  fetal: FetalAssessment;
  labs: LabResults;
  status: VisitStatus;
}

export function saveVisit(user: User, input: VisitInput, existingId?: string): AncVisit {
  const id = existingId ?? Crypto.randomUUID();
  const now = nowIso();
  const visitDate = toIsoDate(new Date());
  db.runSync(
    `INSERT INTO anc_visits (id, patient_id, visit_date, gestational_age_weeks, vitals, symptoms, fetal, labs, status, created_by, created_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
     ON CONFLICT(id) DO UPDATE SET
       gestational_age_weeks = excluded.gestational_age_weeks,
       vitals = excluded.vitals,
       symptoms = excluded.symptoms,
       fetal = excluded.fetal,
       labs = excluded.labs,
       status = excluded.status,
       sync_status = 'pending'`,
    [
      id,
      input.patientId,
      visitDate,
      input.gestationalAgeWeeks,
      JSON.stringify(input.vitals),
      JSON.stringify(input.symptoms),
      JSON.stringify(input.fetal),
      JSON.stringify(input.labs),
      input.status,
      user.id,
      now,
    ]
  );
  logAudit(user, 'ANC_VISIT_SAVED', `Visit ${id} (${input.status}) for patient ${input.patientId}`);
  const row = db.getFirstSync<VisitRow>('SELECT * FROM anc_visits WHERE id = ?', [id]);
  return mapVisit(row as VisitRow);
}

export function getVisit(id: string): AncVisit | null {
  const row = db.getFirstSync<VisitRow>('SELECT * FROM anc_visits WHERE id = ?', [id]);
  return row ? mapVisit(row) : null;
}

export function listVisitsForPatient(patientId: string): AncVisit[] {
  return db
    .getAllSync<VisitRow>(
      'SELECT * FROM anc_visits WHERE patient_id = ? ORDER BY created_at DESC',
      [patientId]
    )
    .map(mapVisit);
}

export function countVisitsToday(): number {
  const today = toIsoDate(new Date());
  const row = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM anc_visits WHERE visit_date = ?',
    [today]
  );
  return row?.n ?? 0;
}
