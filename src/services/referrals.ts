/** Referral generation (Chapter 4.10) and follow-up scheduling (Chapter 4.11). */
import * as Crypto from 'expo-crypto';

import { FollowUp, Referral, RiskLevel, SyncStatus, User } from '@/types';
import { logAudit } from './audit';
import { db, nowIso } from './database';
import { toIsoDate } from '@/utils/calculations';

interface ReferralRow {
  id: string;
  patient_id: string;
  visit_id: string | null;
  assessment_id: string | null;
  reason: string;
  risk_level: RiskLevel;
  notes: string;
  referral_date: string;
  receiving_facility: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_by: string;
  sync_status: SyncStatus;
}

function mapReferral(row: ReferralRow): Referral {
  return {
    id: row.id,
    patientId: row.patient_id,
    visitId: row.visit_id,
    assessmentId: row.assessment_id,
    reason: row.reason,
    riskLevel: row.risk_level,
    notes: row.notes,
    referralDate: row.referral_date,
    receivingFacility: row.receiving_facility,
    status: row.status,
    createdBy: row.created_by,
    syncStatus: row.sync_status,
  };
}

export interface ReferralInput {
  patientId: string;
  visitId: string | null;
  assessmentId: string | null;
  reason: string;
  riskLevel: RiskLevel;
  notes: string;
  receivingFacility: string;
}

export function createReferral(user: User, input: ReferralInput): Referral {
  const referral: Referral = {
    id: Crypto.randomUUID(),
    ...input,
    referralDate: toIsoDate(new Date()),
    status: 'pending',
    createdBy: user.id,
    syncStatus: 'pending',
  };
  db.runSync(
    `INSERT INTO referrals (id, patient_id, visit_id, assessment_id, reason, risk_level, notes, referral_date, receiving_facility, status, created_by, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'pending')`,
    [
      referral.id,
      referral.patientId,
      referral.visitId,
      referral.assessmentId,
      referral.reason,
      referral.riskLevel,
      referral.notes,
      referral.referralDate,
      referral.receivingFacility,
      referral.createdBy,
    ]
  );
  logAudit(user, 'REFERRAL_GENERATED', `Referral for patient ${input.patientId}: ${input.reason}`);
  return referral;
}

export function listReferralsForPatient(patientId: string): Referral[] {
  return db
    .getAllSync<ReferralRow>(
      'SELECT * FROM referrals WHERE patient_id = ? ORDER BY referral_date DESC',
      [patientId]
    )
    .map(mapReferral);
}

export function countPendingReferrals(): number {
  const row = db.getFirstSync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM referrals WHERE status = 'pending'"
  );
  return row?.n ?? 0;
}

interface FollowUpRow {
  id: string;
  patient_id: string;
  visit_id: string | null;
  due_date: string;
  reason: string;
  status: 'scheduled' | 'attended' | 'missed';
}

function mapFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    patientId: row.patient_id,
    visitId: row.visit_id,
    dueDate: row.due_date,
    reason: row.reason,
    status: row.status,
  };
}

export function scheduleFollowUp(
  user: User,
  patientId: string,
  visitId: string | null,
  dueDate: string,
  reason = 'Routine ANC'
): FollowUp {
  const followUp: FollowUp = {
    id: Crypto.randomUUID(),
    patientId,
    visitId,
    dueDate,
    reason,
    status: 'scheduled',
  };
  db.runSync(
    "INSERT INTO follow_ups (id, patient_id, visit_id, due_date, reason, status) VALUES (?, ?, ?, ?, ?, 'scheduled')",
    [followUp.id, followUp.patientId, followUp.visitId, followUp.dueDate, followUp.reason]
  );
  logAudit(user, 'FOLLOW_UP_SCHEDULED', `Next visit ${dueDate} for patient ${patientId}`);
  return followUp;
}

export interface DueFollowUp extends FollowUp {
  patientName: string;
}

export function listUpcomingFollowUps(limit = 50): DueFollowUp[] {
  const rows = db.getAllSync<FollowUpRow & { full_name: string }>(
    `SELECT f.*, p.full_name FROM follow_ups f
     JOIN patients p ON p.id = f.patient_id
     WHERE f.status = 'scheduled'
     ORDER BY f.due_date ASC LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({ ...mapFollowUp(row), patientName: row.full_name }));
}
