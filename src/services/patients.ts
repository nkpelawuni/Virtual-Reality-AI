/** Patient registration, search and retrieval (Chapter 4.5-4.6). */
import * as Crypto from 'expo-crypto';

import { MedicalHistory, Patient, SyncStatus, User } from '@/types';
import { logAudit } from './audit';
import { db, nowIso } from './database';

export const EMPTY_MEDICAL_HISTORY: MedicalHistory = {
  hypertension: false,
  diabetes: false,
  hiv: false,
  malaria: false,
  anaemia: false,
  asthma: false,
  previousCaesarean: false,
  previousPPH: false,
  multiplePregnancy: false,
};

export const MEDICAL_HISTORY_LABELS: Record<keyof MedicalHistory, string> = {
  hypertension: 'Hypertension',
  diabetes: 'Diabetes',
  hiv: 'HIV',
  malaria: 'Malaria',
  anaemia: 'Anaemia',
  asthma: 'Asthma',
  previousCaesarean: 'Previous Caesarean',
  previousPPH: 'Previous PPH',
  multiplePregnancy: 'Multiple Pregnancy',
};

interface PatientRow {
  id: string;
  facility_id: string | null;
  photo_uri: string | null;
  full_name: string;
  date_of_birth: string;
  phone: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  national_id: string | null;
  nhis_number: string | null;
  gravidity: number | null;
  parity: number | null;
  lmp: string | null;
  medical_history: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

function mapPatient(row: PatientRow): Patient {
  let history = EMPTY_MEDICAL_HISTORY;
  try {
    history = { ...EMPTY_MEDICAL_HISTORY, ...JSON.parse(row.medical_history) };
  } catch {
    // keep defaults on malformed data
  }
  return {
    id: row.id,
    facilityId: row.facility_id,
    photoUri: row.photo_uri,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    phone: row.phone,
    address: row.address,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    nationalId: row.national_id,
    nhisNumber: row.nhis_number,
    gravidity: row.gravidity,
    parity: row.parity,
    lmp: row.lmp,
    medicalHistory: history,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export interface PatientInput {
  photoUri: string | null;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  nationalId: string | null;
  nhisNumber: string | null;
  gravidity: number | null;
  parity: number | null;
  lmp: string | null;
  medicalHistory: MedicalHistory;
}

export function createPatient(user: User, input: PatientInput): Patient {
  const now = nowIso();
  const patient: Patient = {
    id: Crypto.randomUUID(),
    facilityId: user.facilityId,
    ...input,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };
  db.runSync(
    `INSERT INTO patients (
       id, facility_id, photo_uri, full_name, date_of_birth, phone, address,
       emergency_contact_name, emergency_contact_phone, national_id, nhis_number,
       gravidity, parity, lmp, medical_history, created_by, created_at, updated_at, sync_status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      patient.id,
      patient.facilityId,
      patient.photoUri,
      patient.fullName,
      patient.dateOfBirth,
      patient.phone,
      patient.address,
      patient.emergencyContactName,
      patient.emergencyContactPhone,
      patient.nationalId,
      patient.nhisNumber,
      patient.gravidity,
      patient.parity,
      patient.lmp,
      JSON.stringify(patient.medicalHistory),
      patient.createdBy,
      patient.createdAt,
      patient.updatedAt,
    ]
  );
  logAudit(user, 'PATIENT_CREATED', `Registered patient: ${patient.fullName}`);
  return patient;
}

export function updatePatientPhoto(user: User, patientId: string, photoUri: string | null): void {
  db.runSync(
    "UPDATE patients SET photo_uri = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
    [photoUri, nowIso(), patientId]
  );
  logAudit(user, 'PATIENT_EDITED', `Photo updated for patient ${patientId}`);
}

export function getPatient(id: string): Patient | null {
  const row = db.getFirstSync<PatientRow>('SELECT * FROM patients WHERE id = ?', [id]);
  return row ? mapPatient(row) : null;
}

/** Search by name, phone, patient ID, National ID or NHIS number (§4.5). */
export function searchPatients(query: string, limit = 30): Patient[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return db
      .getAllSync<PatientRow>('SELECT * FROM patients ORDER BY updated_at DESC LIMIT ?', [limit])
      .map(mapPatient);
  }
  const like = `%${trimmed}%`;
  return db
    .getAllSync<PatientRow>(
      `SELECT * FROM patients
       WHERE full_name LIKE ? OR phone LIKE ? OR id LIKE ? OR national_id LIKE ? OR nhis_number LIKE ?
       ORDER BY full_name LIMIT ?`,
      [like, like, like, like, like, limit]
    )
    .map(mapPatient);
}

export function countPatients(): number {
  const row = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM patients');
  return row?.n ?? 0;
}
