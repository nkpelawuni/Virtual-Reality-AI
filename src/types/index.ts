/** Shared domain models for MamaVR AI. */

export type UserRole = 'admin' | 'healthcare_worker';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  facilityId: string | null;
  avatarUri: string | null;
  createdAt: string;
}

export type FacilityType = 'hospital' | 'health_centre' | 'chps_compound';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  district: string;
  region: string;
  logoUri: string | null;
  createdAt: string;
}

export type SyncStatus = 'pending' | 'synced';

export interface MedicalHistory {
  hypertension: boolean;
  diabetes: boolean;
  hiv: boolean;
  malaria: boolean;
  anaemia: boolean;
  asthma: boolean;
  previousCaesarean: boolean;
  previousPPH: boolean;
  multiplePregnancy: boolean;
}

export interface Patient {
  id: string;
  facilityId: string | null;
  photoUri: string | null;
  fullName: string;
  dateOfBirth: string; // ISO date
  phone: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  nationalId: string | null;
  nhisNumber: string | null;
  gravidity: number | null;
  parity: number | null;
  lmp: string | null; // ISO date of last menstrual period
  medicalHistory: MedicalHistory;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface VitalSigns {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  temperature?: number;
  respiratoryRate?: number;
  weightKg?: number;
  heightCm?: number;
  urinalysis?: string;
  hb?: number;
  bloodSugar?: number;
}

export const SYMPTOM_KEYS = [
  'headache',
  'blurredVision',
  'bleeding',
  'convulsions',
  'fever',
  'severeAbdominalPain',
  'swelling',
  'reducedFetalMovement',
  'vomiting',
  'difficultyBreathing',
] as const;

export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

export const SYMPTOM_LABELS: Record<SymptomKey, string> = {
  headache: 'Severe Headache',
  blurredVision: 'Blurred Vision',
  bleeding: 'Vaginal Bleeding',
  convulsions: 'Convulsions',
  fever: 'Fever',
  severeAbdominalPain: 'Severe Abdominal Pain',
  swelling: 'Swelling of Hands / Face',
  reducedFetalMovement: 'Reduced Fetal Movement',
  vomiting: 'Persistent Vomiting',
  difficultyBreathing: 'Difficulty Breathing',
};

export interface FetalAssessment {
  fetalHeartRate?: number;
  fundalHeight?: number;
  presentation?: 'cephalic' | 'breech' | 'transverse' | 'unknown';
  fetalMovement?: 'normal' | 'reduced' | 'absent' | 'unknown';
}

export interface LabResults {
  hb?: number;
  urineProtein?: 'negative' | 'trace' | '1+' | '2+' | '3+';
  urineGlucose?: 'negative' | 'trace' | '1+' | '2+' | '3+';
  hiv?: 'negative' | 'positive' | 'unknown';
  syphilis?: 'negative' | 'positive' | 'unknown';
  malaria?: 'negative' | 'positive' | 'unknown';
  bloodGroup?: string;
}

export type VisitStatus = 'draft' | 'completed';

export interface AncVisit {
  id: string;
  patientId: string;
  visitDate: string;
  gestationalAgeWeeks: number | null;
  vitals: VitalSigns;
  symptoms: SymptomKey[];
  fetal: FetalAssessment;
  labs: LabResults;
  status: VisitStatus;
  createdBy: string;
  createdAt: string;
  syncStatus: SyncStatus;
}

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface RuleFinding {
  ruleId: string;
  title: string;
  risk: RiskLevel;
  evidence: string[];
  explanation: string;
  actions: string[];
  vrModuleId: string;
  source: string;
}

export interface AiAssessment {
  id: string;
  visitId: string;
  patientId: string;
  overallRisk: RiskLevel;
  findings: RuleFinding[];
  missingData: string[];
  confidence: number; // 0-100, data-completeness indicator, NOT diagnostic probability
  recommendedVrModuleId: string;
  generatedAt: string;
  generatedBy: string;
  syncStatus: SyncStatus;
}

export type ReferralStatus = 'pending' | 'completed' | 'cancelled';

export interface Referral {
  id: string;
  patientId: string;
  visitId: string | null;
  assessmentId: string | null;
  reason: string;
  riskLevel: RiskLevel;
  notes: string;
  referralDate: string;
  receivingFacility: string;
  status: ReferralStatus;
  createdBy: string;
  syncStatus: SyncStatus;
}

export interface FollowUp {
  id: string;
  patientId: string;
  visitId: string | null;
  dueDate: string;
  reason: string;
  status: 'scheduled' | 'attended' | 'missed';
}

export type VrLanguage = 'en' | 'dag';

export const VR_LANGUAGE_LABELS: Record<VrLanguage, string> = {
  en: 'English',
  dag: 'Dagbani',
};

export interface VrModule {
  id: string;
  title: string;
  purpose: string;
  keyMessages: string[];
  durationMinutes: number;
  videoUri: string | null; // uploaded by administrators via Media Manager
  thumbnailUri: string | null; // uploaded image shown in the library
  languages: VrLanguage[];
  isBuiltin: boolean;
  createdAt: string;
}

export interface VrSession {
  id: string;
  moduleId: string;
  patientId: string | null;
  visitId: string | null;
  language: VrLanguage;
  completed: boolean;
  progressPercent: number;
  startedAt: string;
  endedAt: string | null;
  syncStatus: SyncStatus;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  username: string;
  facilityId: string | null;
  action: string;
  detail: string;
  deviceId: string;
  createdAt: string;
}

export type MediaKind = 'image' | 'video';

export type MediaOwnerType =
  | 'patient_photo'
  | 'facility_logo'
  | 'app_logo'
  | 'user_avatar'
  | 'vr_video'
  | 'vr_thumbnail'
  | 'team_photo';

/** Project team profile (§11.16) shown on the About / Project Team screen. */
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  qualification: string;
  responsibilities: string[];
  photoUri: string | null;
  /** Team lead renders at the top of the structure chart. */
  isLead: boolean;
  displayOrder: number;
}

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  uri: string;
  mimeType: string;
  ownerType: MediaOwnerType;
  ownerId: string | null;
  sizeBytes: number | null;
  uploaded: boolean;
  createdAt: string;
}
