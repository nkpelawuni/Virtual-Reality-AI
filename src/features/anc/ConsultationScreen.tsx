import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, CheckboxRow, Field, Screen, ScreenTitle, SegmentedControl } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { generateAndStoreAssessment } from '@/services/assessments';
import { getPatient } from '@/services/patients';
import { getVisit, saveVisit } from '@/services/visits';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import {
  FetalAssessment,
  LabResults,
  SYMPTOM_KEYS,
  SYMPTOM_LABELS,
  SymptomKey,
  VitalSigns,
} from '@/types';
import { bmi, formatGestationalAge, gestationalAgeFromLmp } from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'Consultation'>;

const TABS = ['Vital Signs', 'Symptoms', 'Fetal', 'Laboratory'] as const;
type Tab = (typeof TABS)[number];

function num(value: string): number | undefined {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : undefined;
}

function str(value: number | undefined): string {
  return value != null ? String(value) : '';
}

export function ConsultationScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const patient = getPatient(route.params.patientId);
  const existingVisit = route.params.visitId ? getVisit(route.params.visitId) : null;

  const [tab, setTab] = useState<Tab>('Vital Signs');
  const [visitId, setVisitId] = useState<string | undefined>(existingVisit?.id);
  const [generating, setGenerating] = useState(false);

  // Vitals as text inputs; converted on save.
  const v = existingVisit?.vitals ?? {};
  const [systolic, setSystolic] = useState(str(v.systolic));
  const [diastolic, setDiastolic] = useState(str(v.diastolic));
  const [pulse, setPulse] = useState(str(v.pulse));
  const [temperature, setTemperature] = useState(str(v.temperature));
  const [respRate, setRespRate] = useState(str(v.respiratoryRate));
  const [weight, setWeight] = useState(str(v.weightKg));
  const [height, setHeight] = useState(str(v.heightCm));
  const [urinalysis, setUrinalysis] = useState(v.urinalysis ?? '');
  const [hbVital, setHbVital] = useState(str(v.hb));
  const [bloodSugar, setBloodSugar] = useState(str(v.bloodSugar));

  const [symptoms, setSymptoms] = useState<SymptomKey[]>(existingVisit?.symptoms ?? []);

  const f = existingVisit?.fetal ?? {};
  const [fhr, setFhr] = useState(str(f.fetalHeartRate));
  const [fundalHeight, setFundalHeight] = useState(str(f.fundalHeight));
  const [presentation, setPresentation] = useState<FetalAssessment['presentation']>(f.presentation);
  const [movement, setMovement] = useState<FetalAssessment['fetalMovement']>(f.fetalMovement);

  const l = existingVisit?.labs ?? {};
  const [hbLab, setHbLab] = useState(str(l.hb));
  const [urineProtein, setUrineProtein] = useState<LabResults['urineProtein']>(l.urineProtein);
  const [urineGlucose, setUrineGlucose] = useState<LabResults['urineGlucose']>(l.urineGlucose);
  const [hiv, setHiv] = useState<LabResults['hiv']>(l.hiv);
  const [syphilis, setSyphilis] = useState<LabResults['syphilis']>(l.syphilis);
  const [malaria, setMalaria] = useState<LabResults['malaria']>(l.malaria);
  const [bloodGroup, setBloodGroup] = useState(l.bloodGroup ?? '');

  const ga = patient?.lmp ? gestationalAgeFromLmp(patient.lmp) : null;
  const bmiValue = useMemo(() => bmi(num(weight), num(height)), [weight, height]);

  if (!patient || !user) {
    return (
      <Screen>
        <Text style={{ color: theme.colors.danger }}>Patient not found.</Text>
      </Screen>
    );
  }

  const collectInput = (status: 'draft' | 'completed') => ({
    patientId: patient.id,
    gestationalAgeWeeks: ga?.weeks ?? null,
    vitals: {
      systolic: num(systolic),
      diastolic: num(diastolic),
      pulse: num(pulse),
      temperature: num(temperature),
      respiratoryRate: num(respRate),
      weightKg: num(weight),
      heightCm: num(height),
      urinalysis: urinalysis || undefined,
      hb: num(hbVital),
      bloodSugar: num(bloodSugar),
    } satisfies VitalSigns,
    symptoms,
    fetal: {
      fetalHeartRate: num(fhr),
      fundalHeight: num(fundalHeight),
      presentation,
      fetalMovement: movement,
    } satisfies FetalAssessment,
    labs: {
      hb: num(hbLab),
      urineProtein,
      urineGlucose,
      hiv,
      syphilis,
      malaria,
      bloodGroup: bloodGroup || undefined,
    } satisfies LabResults,
    status,
  });

  const handleSaveDraft = () => {
    const visit = saveVisit(user, collectInput('draft'), visitId);
    setVisitId(visit.id);
    Alert.alert('Draft Saved', 'The consultation has been saved. You can continue it later from the patient record.');
  };

  const handleGenerateAssessment = () => {
    const hasBp = num(systolic) != null && num(diastolic) != null;
    if (!hasBp) {
      Alert.alert(
        'Missing Information',
        'Blood pressure has not been recorded. The AI assessment will be based on incomplete information. Continue anyway?',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Continue', onPress: () => runAssessmentFlow() },
        ]
      );
      return;
    }
    runAssessmentFlow();
  };

  const runAssessmentFlow = () => {
    setGenerating(true);
    // Save (or update) the visit first so the assessment references stored data.
    const visit = saveVisit(user, collectInput('completed'), visitId);
    setVisitId(visit.id);
    const assessment = generateAndStoreAssessment(user, patient, visit);
    setGenerating(false);
    navigation.navigate('Assessment', { assessmentId: assessment.id });
  };

  const toggleSymptom = (key: SymptomKey) =>
    setSymptoms((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));

  return (
    <Screen>
      <ScreenTitle subtitle={`${patient.fullName} · ${formatGestationalAge(ga)}`}>
        ANC Consultation
      </ScreenTitle>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.colors.onPrimary : theme.colors.text,
                  fontSize: 13,
                  fontWeight: active ? '700' : '500',
                }}
              >
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'Vital Signs' ? (
        <Card>
          <View style={styles.pairRow}>
            <View style={{ flex: 1 }}>
              <Field label="BP Systolic (mmHg)" value={systolic} onChangeText={setSystolic} keyboardType="numeric" placeholder="120" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="BP Diastolic (mmHg)" value={diastolic} onChangeText={setDiastolic} keyboardType="numeric" placeholder="80" />
            </View>
          </View>
          <View style={styles.pairRow}>
            <View style={{ flex: 1 }}>
              <Field label="Pulse (bpm)" value={pulse} onChangeText={setPulse} keyboardType="numeric" placeholder="80" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Temperature (°C)" value={temperature} onChangeText={setTemperature} keyboardType="numeric" placeholder="36.8" />
            </View>
          </View>
          <View style={styles.pairRow}>
            <View style={{ flex: 1 }}>
              <Field label="Resp. Rate (/min)" value={respRate} onChangeText={setRespRate} keyboardType="numeric" placeholder="18" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Blood Sugar (mmol/L)" value={bloodSugar} onChangeText={setBloodSugar} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.pairRow}>
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="65" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="160" />
            </View>
          </View>
          <View style={[styles.bmiBox, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary }}>
              BMI (automatic):{' '}
              <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
                {bmiValue != null ? `${bmiValue} kg/m²` : '—'}
              </Text>
            </Text>
          </View>
          <Field label="Urinalysis Notes" value={urinalysis} onChangeText={setUrinalysis} placeholder="e.g. clear, nitrites negative" />
          <Field label="Hb (g/dL) — point of care" value={hbVital} onChangeText={setHbVital} keyboardType="numeric" />
        </Card>
      ) : null}

      {tab === 'Symptoms' ? (
        <Card>
          <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginBottom: spacing.sm }}>
            Tick every symptom the patient reports. Danger signs trigger immediate AI alerts.
          </Text>
          {SYMPTOM_KEYS.map((key) => (
            <CheckboxRow
              key={key}
              label={SYMPTOM_LABELS[key]}
              checked={symptoms.includes(key)}
              onToggle={() => toggleSymptom(key)}
            />
          ))}
        </Card>
      ) : null}

      {tab === 'Fetal' ? (
        <Card>
          <Field label="Fetal Heart Rate (bpm)" value={fhr} onChangeText={setFhr} keyboardType="numeric" placeholder="140" />
          <Field label="Fundal Height (cm)" value={fundalHeight} onChangeText={setFundalHeight} keyboardType="numeric" />
          <SegmentedControl
            label="Presentation"
            value={presentation}
            onChange={setPresentation}
            options={[
              { value: 'cephalic', label: 'Cephalic' },
              { value: 'breech', label: 'Breech' },
              { value: 'transverse', label: 'Transverse' },
              { value: 'unknown', label: 'Unknown' },
            ]}
          />
          <SegmentedControl
            label="Fetal Movement"
            value={movement}
            onChange={setMovement}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'reduced', label: 'Reduced' },
              { value: 'absent', label: 'Absent' },
              { value: 'unknown', label: 'Unknown' },
            ]}
          />
        </Card>
      ) : null}

      {tab === 'Laboratory' ? (
        <Card>
          <Field label="Haemoglobin (g/dL)" value={hbLab} onChangeText={setHbLab} keyboardType="numeric" placeholder="11.5" />
          <SegmentedControl
            label="Urine Protein"
            value={urineProtein}
            onChange={setUrineProtein}
            options={[
              { value: 'negative', label: 'Negative' },
              { value: 'trace', label: 'Trace' },
              { value: '1+', label: '1+' },
              { value: '2+', label: '2+' },
              { value: '3+', label: '3+' },
            ]}
          />
          <SegmentedControl
            label="Urine Glucose"
            value={urineGlucose}
            onChange={setUrineGlucose}
            options={[
              { value: 'negative', label: 'Negative' },
              { value: 'trace', label: 'Trace' },
              { value: '1+', label: '1+' },
              { value: '2+', label: '2+' },
              { value: '3+', label: '3+' },
            ]}
          />
          <SegmentedControl
            label="HIV Screening"
            value={hiv}
            onChange={setHiv}
            options={[
              { value: 'negative', label: 'Negative' },
              { value: 'positive', label: 'Positive' },
              { value: 'unknown', label: 'Not done' },
            ]}
          />
          <SegmentedControl
            label="Syphilis Screening"
            value={syphilis}
            onChange={setSyphilis}
            options={[
              { value: 'negative', label: 'Negative' },
              { value: 'positive', label: 'Positive' },
              { value: 'unknown', label: 'Not done' },
            ]}
          />
          <SegmentedControl
            label="Malaria Test"
            value={malaria}
            onChange={setMalaria}
            options={[
              { value: 'negative', label: 'Negative' },
              { value: 'positive', label: 'Positive' },
              { value: 'unknown', label: 'Not done' },
            ]}
          />
          <Field label="Blood Group" value={bloodGroup} onChangeText={setBloodGroup} placeholder="e.g. O+" autoCapitalize="none" />
        </Card>
      ) : null}

      <Button
        title="Generate AI Assessment"
        icon="sparkles-outline"
        onPress={handleGenerateAssessment}
        loading={generating}
      />
      <View style={styles.pairRow}>
        <Button title="Save Draft" variant="secondary" style={{ flex: 1 }} onPress={handleSaveDraft} />
        <Button title="Back" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pairRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bmiBox: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
});
