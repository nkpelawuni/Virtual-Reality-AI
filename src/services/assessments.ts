/** Persistence + audit for AI assessments (Chapter 6.10: every assessment is recorded). */
import * as Crypto from 'expo-crypto';

import { AiAssessment, AncVisit, Patient, RiskLevel, RuleFinding, SyncStatus, User } from '@/types';
import { runAssessment } from '@/ai/engine';
import { logAudit } from './audit';
import { db, nowIso } from './database';

interface AssessmentRow {
  id: string;
  visit_id: string;
  patient_id: string;
  overall_risk: RiskLevel;
  findings: string;
  missing_data: string;
  confidence: number;
  recommended_vr_module_id: string;
  generated_at: string;
  generated_by: string;
  sync_status: SyncStatus;
}

function mapAssessment(row: AssessmentRow): AiAssessment {
  return {
    id: row.id,
    visitId: row.visit_id,
    patientId: row.patient_id,
    overallRisk: row.overall_risk,
    findings: JSON.parse(row.findings) as RuleFinding[],
    missingData: JSON.parse(row.missing_data) as string[],
    confidence: row.confidence,
    recommendedVrModuleId: row.recommended_vr_module_id,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by,
    syncStatus: row.sync_status,
  };
}

export function generateAndStoreAssessment(
  user: User,
  patient: Patient,
  visit: AncVisit
): AiAssessment {
  const result = runAssessment({ patient, visit });
  const assessment: AiAssessment = {
    id: Crypto.randomUUID(),
    visitId: visit.id,
    patientId: patient.id,
    overallRisk: result.overallRisk,
    findings: result.findings,
    missingData: result.missingData,
    confidence: result.confidence,
    recommendedVrModuleId: result.recommendedVrModuleId,
    generatedAt: nowIso(),
    generatedBy: user.id,
    syncStatus: 'pending',
  };
  db.runSync(
    `INSERT INTO assessments (id, visit_id, patient_id, overall_risk, findings, missing_data, confidence, recommended_vr_module_id, generated_at, generated_by, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      assessment.id,
      assessment.visitId,
      assessment.patientId,
      assessment.overallRisk,
      JSON.stringify(assessment.findings),
      JSON.stringify(assessment.missingData),
      assessment.confidence,
      assessment.recommendedVrModuleId,
      assessment.generatedAt,
      assessment.generatedBy,
    ]
  );
  logAudit(
    user,
    'AI_ASSESSMENT_GENERATED',
    `${assessment.overallRisk.toUpperCase()} risk for patient ${patient.fullName} (confidence ${assessment.confidence}%)`
  );
  return assessment;
}

export function getAssessment(id: string): AiAssessment | null {
  const row = db.getFirstSync<AssessmentRow>('SELECT * FROM assessments WHERE id = ?', [id]);
  return row ? mapAssessment(row) : null;
}

export function getLatestAssessmentForPatient(patientId: string): AiAssessment | null {
  const row = db.getFirstSync<AssessmentRow>(
    'SELECT * FROM assessments WHERE patient_id = ? ORDER BY generated_at DESC LIMIT 1',
    [patientId]
  );
  return row ? mapAssessment(row) : null;
}

export function countHighRiskPatients(): number {
  const row = db.getFirstSync<{ n: number }>(
    `SELECT COUNT(DISTINCT patient_id) AS n FROM assessments a
     WHERE overall_risk = 'high'
       AND generated_at = (SELECT MAX(generated_at) FROM assessments WHERE patient_id = a.patient_id)`
  );
  return row?.n ?? 0;
}

export interface HighRiskEntry {
  assessment: AiAssessment;
  patientName: string;
}

export function listHighRiskPatients(limit = 50): HighRiskEntry[] {
  const rows = db.getAllSync<AssessmentRow & { full_name: string }>(
    `SELECT a.*, p.full_name FROM assessments a
     JOIN patients p ON p.id = a.patient_id
     WHERE a.overall_risk = 'high'
       AND a.generated_at = (SELECT MAX(generated_at) FROM assessments WHERE patient_id = a.patient_id)
     ORDER BY a.generated_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({ assessment: mapAssessment(row), patientName: row.full_name }));
}
