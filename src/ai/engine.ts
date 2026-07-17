/**
 * AI Clinical Decision Support Engine (Chapter 6).
 *
 * A deterministic, explainable rule engine built on WHO antenatal care
 * recommendations and Ghana Health Service guidance. It never provides a
 * definitive diagnosis: it classifies risk (low / moderate / high), lists the
 * exact clinical findings that triggered each alert, recommends actions and
 * suggests the matching VR education module. The confidence value reflects
 * data completeness only — it is NOT a diagnostic probability (§6.7).
 *
 * The engine is a pure function of its input so results are reproducible and
 * fully offline (§6.12). Future validated ML models can replace `runRules`
 * behind the same interface (§9.8).
 */
import {
  AncVisit,
  Patient,
  RiskLevel,
  RuleFinding,
  SYMPTOM_LABELS,
  SymptomKey,
} from '@/types';
import { ageFromDob, bmi } from '@/utils/calculations';

export interface ClinicalInput {
  patient: Patient;
  visit: AncVisit;
}

interface RuleContext {
  age: number | null;
  gaWeeks: number | null;
  bmiValue: number | null;
  has: (symptom: SymptomKey) => boolean;
  patient: Patient;
  visit: AncVisit;
}

interface ClinicalRule {
  id: string;
  evaluate: (ctx: RuleContext) => RuleFinding | null;
}

const WHO_ANC = 'WHO Recommendations on Antenatal Care (2016)';
const WHO_DANGER = 'WHO maternal danger-sign guidance';
const GHS = 'Ghana Health Service maternal health protocols';

function finding(
  ruleId: string,
  title: string,
  risk: RiskLevel,
  evidence: string[],
  explanation: string,
  actions: string[],
  vrModuleId: string,
  source: string
): RuleFinding {
  return { ruleId, title, risk, evidence, explanation, actions, vrModuleId, source };
}

const RULES: ClinicalRule[] = [
  {
    id: 'severe-preeclampsia',
    evaluate: ({ visit, has }) => {
      const { systolic, diastolic } = visit.vitals;
      if (systolic == null || diastolic == null) return null;
      const severe = systolic >= 160 || diastolic >= 110;
      if (!severe) return null;
      const evidence = [`Blood pressure ${systolic}/${diastolic} mmHg (severe range)`];
      if (has('headache')) evidence.push(SYMPTOM_LABELS.headache);
      if (has('blurredVision')) evidence.push(SYMPTOM_LABELS.blurredVision);
      if (visit.labs.urineProtein && visit.labs.urineProtein !== 'negative') {
        evidence.push(`Urine protein ${visit.labs.urineProtein}`);
      }
      return finding(
        'severe-preeclampsia',
        'Severe Hypertension — Possible Severe Pre-eclampsia',
        'high',
        evidence,
        'Severely elevated blood pressure in pregnancy requires urgent clinical assessment to exclude severe pre-eclampsia and prevent eclampsia.',
        [
          'Repeat blood pressure after 15 minutes of rest.',
          'Test urine protein immediately if available.',
          'Arrange urgent referral according to local protocol.',
          'Monitor the mother continuously until transfer.',
        ],
        'pre-eclampsia',
        WHO_ANC
      );
    },
  },
  {
    id: 'preeclampsia',
    evaluate: ({ visit, has }) => {
      const { systolic, diastolic } = visit.vitals;
      if (systolic == null || diastolic == null) return null;
      const elevated = systolic >= 140 || diastolic >= 90;
      const severeRange = systolic >= 160 || diastolic >= 110;
      if (!elevated || severeRange) return null;
      const neuro = has('headache') || has('blurredVision') || has('swelling');
      const evidence = [`Blood pressure ${systolic}/${diastolic} mmHg`];
      if (has('headache')) evidence.push(SYMPTOM_LABELS.headache);
      if (has('blurredVision')) evidence.push(SYMPTOM_LABELS.blurredVision);
      if (has('swelling')) evidence.push(SYMPTOM_LABELS.swelling);
      if (visit.labs.urineProtein && visit.labs.urineProtein !== 'negative') {
        evidence.push(`Urine protein ${visit.labs.urineProtein}`);
      }
      return finding(
        'preeclampsia',
        neuro ? 'Possible Pre-eclampsia' : 'Elevated Blood Pressure',
        neuro ? 'high' : 'moderate',
        evidence,
        neuro
          ? 'Elevated blood pressure with neurological symptoms may indicate hypertensive disease in pregnancy and requires urgent clinical assessment.'
          : 'Blood pressure of 140/90 mmHg or higher requires closer observation and repeat measurement.',
        neuro
          ? [
              'Repeat blood pressure measurement.',
              'Perform urine protein testing if available.',
              'Arrange urgent referral according to local protocol.',
            ]
          : [
              'Repeat blood pressure after rest.',
              'Assess urine protein.',
              'Schedule early review and counsel on danger signs.',
            ],
        'pre-eclampsia',
        WHO_ANC
      );
    },
  },
  {
    id: 'eclampsia-warning',
    evaluate: ({ has }) =>
      has('convulsions')
        ? finding(
            'eclampsia-warning',
            'Convulsions — Obstetric Emergency',
            'high',
            [SYMPTOM_LABELS.convulsions],
            'Convulsions in pregnancy suggest eclampsia until proven otherwise and constitute an obstetric emergency.',
            [
              'Initiate emergency assessment and stabilization immediately.',
              'Administer care according to eclampsia protocol.',
              'Arrange immediate referral to a comprehensive emergency obstetric care facility.',
            ],
            'danger-signs',
            WHO_DANGER
          )
        : null,
  },
  {
    id: 'vaginal-bleeding',
    evaluate: ({ has }) =>
      has('bleeding')
        ? finding(
            'vaginal-bleeding',
            'Vaginal Bleeding',
            'high',
            [SYMPTOM_LABELS.bleeding],
            'Vaginal bleeding during pregnancy requires immediate clinical assessment; management depends on gestational age and severity.',
            [
              'Perform immediate clinical assessment.',
              'Do NOT perform a digital vaginal examination until placenta praevia is excluded.',
              'Arrange referral based on gestational age and severity.',
            ],
            'danger-signs',
            WHO_DANGER
          )
        : null,
  },
  {
    id: 'severe-anaemia',
    evaluate: ({ visit }) => {
      const hb = visit.labs.hb ?? visit.vitals.hb;
      if (hb == null) return null;
      if (hb < 7) {
        return finding(
          'severe-anaemia',
          'Severe Anaemia',
          'high',
          [`Haemoglobin ${hb} g/dL (below 7 g/dL)`],
          'Haemoglobin below 7 g/dL indicates severe anaemia, which increases the risk of maternal and fetal complications.',
          [
            'Arrange urgent referral for further assessment and possible transfusion.',
            'Investigate underlying causes (malaria, nutrition, bleeding).',
          ],
          'nutrition-anaemia',
          WHO_ANC
        );
      }
      if (hb < 11) {
        return finding(
          'anaemia',
          'Anaemia in Pregnancy',
          'moderate',
          [`Haemoglobin ${hb} g/dL (below 11 g/dL)`],
          'Haemoglobin below 11 g/dL in pregnancy indicates anaemia and requires nutritional support and follow-up.',
          [
            'Provide iron and folic acid supplementation according to protocol.',
            'Review nutritional status and counsel on iron-rich foods.',
            'Arrange follow-up haemoglobin testing.',
          ],
          'nutrition-anaemia',
          WHO_ANC
        );
      }
      return null;
    },
  },
  {
    id: 'fever-infection',
    evaluate: ({ visit, has }) => {
      const temp = visit.vitals.temperature;
      const fever = (temp != null && temp >= 38) || has('fever');
      if (!fever) return null;
      const evidence: string[] = [];
      if (temp != null && temp >= 38) evidence.push(`Temperature ${temp}°C`);
      if (has('fever')) evidence.push(SYMPTOM_LABELS.fever);
      const malariaPositive = visit.labs.malaria === 'positive';
      if (malariaPositive) evidence.push('Positive malaria test');
      return finding(
        'fever-infection',
        malariaPositive ? 'Malaria in Pregnancy' : 'Fever — Possible Infection',
        'high',
        evidence,
        malariaPositive
          ? 'Malaria in pregnancy is associated with severe maternal anaemia and adverse birth outcomes and requires prompt treatment.'
          : 'Fever in pregnancy may indicate malaria or other infection and requires prompt evaluation.',
        malariaPositive
          ? [
              'Treat according to national malaria in pregnancy protocol.',
              'Check haemoglobin for associated anaemia.',
              'Counsel on insecticide-treated net use.',
            ]
          : [
              'Perform malaria testing where available.',
              'Assess for other sources of infection.',
              'Treat or refer according to findings and local protocol.',
            ],
        'malaria-prevention',
        GHS
      );
    },
  },
  {
    id: 'reduced-fetal-movement',
    evaluate: ({ visit, has }) => {
      const reduced =
        has('reducedFetalMovement') ||
        visit.fetal.fetalMovement === 'reduced' ||
        visit.fetal.fetalMovement === 'absent';
      if (!reduced) return null;
      const evidence = [
        visit.fetal.fetalMovement === 'absent' ? 'Fetal movement absent' : SYMPTOM_LABELS.reducedFetalMovement,
      ];
      if (visit.fetal.fetalHeartRate != null) {
        evidence.push(`Fetal heart rate ${visit.fetal.fetalHeartRate} bpm`);
      }
      return finding(
        'reduced-fetal-movement',
        'Reduced Fetal Movement',
        'high',
        evidence,
        'Reduced or absent fetal movement may indicate fetal compromise and requires prompt fetal assessment.',
        [
          'Auscultate and document the fetal heart rate.',
          'Arrange further fetal assessment or referral according to protocol.',
        ],
        'danger-signs',
        WHO_DANGER
      );
    },
  },
  {
    id: 'abnormal-fhr',
    evaluate: ({ visit }) => {
      const fhr = visit.fetal.fetalHeartRate;
      if (fhr == null || (fhr >= 110 && fhr <= 160)) return null;
      return finding(
        'abnormal-fhr',
        'Abnormal Fetal Heart Rate',
        'high',
        [`Fetal heart rate ${fhr} bpm (normal range 110–160 bpm)`],
        'A fetal heart rate outside the normal range may indicate fetal distress.',
        ['Reassess the fetal heart rate.', 'Arrange urgent fetal evaluation or referral.'],
        'danger-signs',
        WHO_DANGER
      );
    },
  },
  {
    id: 'gestational-diabetes',
    evaluate: ({ visit }) => {
      const glucoseFlag = visit.labs.urineGlucose && visit.labs.urineGlucose !== 'negative' && visit.labs.urineGlucose !== 'trace';
      const highSugar = visit.vitals.bloodSugar != null && visit.vitals.bloodSugar >= 7.8;
      if (!glucoseFlag && !highSugar) return null;
      const evidence: string[] = [];
      if (glucoseFlag) evidence.push(`Urine glucose ${visit.labs.urineGlucose}`);
      if (highSugar) evidence.push(`Blood sugar ${visit.vitals.bloodSugar} mmol/L`);
      return finding(
        'gestational-diabetes',
        'Possible Gestational Diabetes',
        'moderate',
        evidence,
        'Glycosuria or elevated blood sugar may indicate gestational diabetes and warrants confirmatory testing.',
        [
          'Arrange fasting blood glucose or OGTT where available.',
          'Provide dietary counselling.',
          'Schedule closer follow-up.',
        ],
        'nutrition-anaemia',
        WHO_ANC
      );
    },
  },
  {
    id: 'severe-symptoms',
    evaluate: ({ has }) => {
      const severe: SymptomKey[] = ['severeAbdominalPain', 'difficultyBreathing', 'vomiting'];
      const present = severe.filter((s) => has(s));
      if (present.length === 0) return null;
      const highPriority = present.includes('severeAbdominalPain') || present.includes('difficultyBreathing');
      return finding(
        'severe-symptoms',
        'Significant Maternal Symptoms',
        highPriority ? 'high' : 'moderate',
        present.map((s) => SYMPTOM_LABELS[s]),
        'These symptoms may indicate serious pregnancy complications and require clinical evaluation.',
        [
          'Perform focused clinical assessment.',
          'Treat or refer according to findings and local protocol.',
        ],
        'danger-signs',
        WHO_DANGER
      );
    },
  },
  {
    id: 'obstetric-history',
    evaluate: ({ patient }) => {
      const risks: string[] = [];
      const h = patient.medicalHistory;
      if (h.previousCaesarean) risks.push('Previous caesarean section');
      if (h.previousPPH) risks.push('Previous postpartum haemorrhage');
      if (h.multiplePregnancy) risks.push('Multiple pregnancy');
      if (h.hypertension) risks.push('Chronic hypertension');
      if (h.diabetes) risks.push('Pre-existing diabetes');
      if ((patient.parity ?? 0) >= 5) risks.push(`Grand multiparity (parity ${patient.parity})`);
      if (risks.length === 0) return null;
      return finding(
        'obstetric-history',
        'High-Risk Obstetric History',
        'moderate',
        risks,
        'The obstetric and medical history includes factors associated with increased risk of complications; delivery should be planned at an appropriately equipped facility.',
        [
          'Develop an individualized birth plan.',
          'Counsel on facility delivery and birth preparedness.',
          'Consider early specialist review.',
        ],
        'birth-preparedness',
        GHS
      );
    },
  },
  {
    id: 'maternal-age',
    evaluate: ({ age }) => {
      if (age == null) return null;
      if (age < 18) {
        return finding(
          'maternal-age',
          'Adolescent Pregnancy',
          'moderate',
          [`Maternal age ${age} years`],
          'Adolescent pregnancy carries increased risk of complications and benefits from additional support and monitoring.',
          ['Provide adolescent-friendly counselling.', 'Schedule closer follow-up.'],
          'healthy-pregnancy',
          WHO_ANC
        );
      }
      if (age >= 35) {
        return finding(
          'maternal-age',
          'Advanced Maternal Age',
          'moderate',
          [`Maternal age ${age} years`],
          'Pregnancy at 35 years or older is associated with increased risk of hypertensive disorders and other complications.',
          ['Monitor blood pressure closely at every contact.', 'Counsel on danger signs.'],
          'healthy-pregnancy',
          WHO_ANC
        );
      }
      return null;
    },
  },
  {
    id: 'bmi',
    evaluate: ({ bmiValue }) => {
      if (bmiValue == null) return null;
      if (bmiValue < 18.5) {
        return finding(
          'bmi',
          'Underweight — Nutritional Risk',
          'moderate',
          [`BMI ${bmiValue} kg/m² (below 18.5)`],
          'Low maternal BMI increases the risk of low birth weight; nutritional counselling and support are recommended.',
          ['Provide nutritional counselling.', 'Consider balanced energy and protein supplementation.'],
          'nutrition-anaemia',
          WHO_ANC
        );
      }
      if (bmiValue >= 30) {
        return finding(
          'bmi',
          'Obesity in Pregnancy',
          'moderate',
          [`BMI ${bmiValue} kg/m² (30 or above)`],
          'Obesity increases the risk of gestational diabetes and hypertensive disorders.',
          ['Screen for gestational diabetes.', 'Monitor blood pressure closely.', 'Provide dietary counselling.'],
          'nutrition-anaemia',
          WHO_ANC
        );
      }
      return null;
    },
  },
];

const RISK_ORDER: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2 };

/** Fields used to compute the data-completeness confidence indicator (§6.8). */
function completeness(input: ClinicalInput): { confidence: number; missing: string[] } {
  const { patient, visit } = input;
  const checks: Array<[string, boolean]> = [
    ['Blood pressure', visit.vitals.systolic != null && visit.vitals.diastolic != null],
    ['Weight', visit.vitals.weightKg != null],
    ['Height', visit.vitals.heightCm != null],
    ['Temperature', visit.vitals.temperature != null],
    ['Pulse', visit.vitals.pulse != null],
    ['Haemoglobin', (visit.labs.hb ?? visit.vitals.hb) != null],
    ['Urine protein', visit.labs.urineProtein != null],
    ['Gestational age (LMP)', visit.gestationalAgeWeeks != null],
    ['Date of birth', !!patient.dateOfBirth],
    ['Fetal heart rate', visit.fetal.fetalHeartRate != null],
  ];
  const missing = checks.filter(([, present]) => !present).map(([label]) => label);
  const confidence = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return { confidence, missing };
}

export interface EngineResult {
  overallRisk: RiskLevel;
  findings: RuleFinding[];
  missingData: string[];
  confidence: number;
  recommendedVrModuleId: string;
}

/** Pure, deterministic rule evaluation — same input always yields the same output. */
export function runAssessment(input: ClinicalInput): EngineResult {
  const { patient, visit } = input;
  const ctx: RuleContext = {
    age: ageFromDob(patient.dateOfBirth),
    gaWeeks: visit.gestationalAgeWeeks,
    bmiValue: bmi(visit.vitals.weightKg, visit.vitals.heightCm),
    has: (symptom) => visit.symptoms.includes(symptom),
    patient,
    visit,
  };

  const findings = RULES
    .map((rule) => rule.evaluate(ctx))
    .filter((f): f is RuleFinding => f !== null)
    .sort((a, b) => RISK_ORDER[b.risk] - RISK_ORDER[a.risk]);

  const overallRisk: RiskLevel =
    findings.length === 0 ? 'low' : findings[0].risk;

  const { confidence, missing } = completeness(input);

  // The top-ranked finding drives the VR recommendation (§6.9); a low-risk
  // consultation recommends the Healthy Pregnancy Journey module.
  const recommendedVrModuleId = findings.length > 0 ? findings[0].vrModuleId : 'healthy-pregnancy';

  return { overallRisk, findings, missingData: missing, confidence, recommendedVrModuleId };
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'High';
  if (confidence >= 50) return 'Moderate';
  return 'Low — based on incomplete information';
}
