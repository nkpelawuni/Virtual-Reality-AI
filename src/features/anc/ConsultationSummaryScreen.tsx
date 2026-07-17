import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button, Card, EmptyState, KeyValueRow, RiskBadge, Screen, ScreenTitle, SectionHeading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getAssessment } from '@/services/assessments';
import { getPatient } from '@/services/patients';
import { scheduleFollowUp } from '@/services/referrals';
import { hasCompletedVrSession } from '@/services/vr';
import { getVisit } from '@/services/visits';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme/theme';
import { SYMPTOM_LABELS } from '@/types';
import { formatDisplayDate, nextReviewDate } from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'ConsultationSummary'>;

export function ConsultationSummaryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const visit = getVisit(route.params.visitId);
  const assessment = route.params.assessmentId ? getAssessment(route.params.assessmentId) : null;
  const patient = visit ? getPatient(visit.patientId) : null;
  const [followUpScheduled, setFollowUpScheduled] = useState(false);

  if (!visit || !patient) {
    return (
      <Screen>
        <EmptyState icon="document-outline" title="Summary Unavailable" message="The consultation record could not be loaded." />
      </Screen>
    );
  }

  const reviewDate = nextReviewDate(visit.gestationalAgeWeeks);
  const vrCompleted = hasCompletedVrSession(visit.id);

  const handleFinish = () => {
    if (user && !followUpScheduled) {
      scheduleFollowUp(user, patient.id, visit.id, reviewDate);
      setFollowUpScheduled(true);
    }
    Alert.alert('Consultation Saved Successfully', `Next review: ${formatDisplayDate(reviewDate)}`, [
      { text: 'Done', onPress: () => navigation.popToTop() },
    ]);
  };

  return (
    <Screen>
      <ScreenTitle subtitle={formatDisplayDate(visit.visitDate)}>Consultation Summary</ScreenTitle>

      <SectionHeading>Patient</SectionHeading>
      <Card>
        <KeyValueRow label="Name" value={patient.fullName} />
        <KeyValueRow
          label="Gestational Age"
          value={visit.gestationalAgeWeeks != null ? `${visit.gestationalAgeWeeks} weeks` : '—'}
        />
      </Card>

      <SectionHeading>Vital Signs</SectionHeading>
      <Card>
        <KeyValueRow
          label="Blood Pressure"
          value={
            visit.vitals.systolic != null && visit.vitals.diastolic != null
              ? `${visit.vitals.systolic}/${visit.vitals.diastolic} mmHg`
              : '—'
          }
        />
        <KeyValueRow label="Pulse" value={visit.vitals.pulse != null ? `${visit.vitals.pulse} bpm` : '—'} />
        <KeyValueRow label="Temperature" value={visit.vitals.temperature != null ? `${visit.vitals.temperature} °C` : '—'} />
        <KeyValueRow label="Weight" value={visit.vitals.weightKg != null ? `${visit.vitals.weightKg} kg` : '—'} />
        <KeyValueRow label="Haemoglobin" value={(visit.labs.hb ?? visit.vitals.hb) != null ? `${visit.labs.hb ?? visit.vitals.hb} g/dL` : '—'} />
      </Card>

      <SectionHeading>Symptoms</SectionHeading>
      <Card>
        {visit.symptoms.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: typography.caption }}>
            No danger-sign symptoms reported.
          </Text>
        ) : (
          visit.symptoms.map((symptom) => (
            <Text key={symptom} style={{ color: theme.colors.text, fontSize: typography.caption, paddingVertical: 2 }}>
              • {SYMPTOM_LABELS[symptom]}
            </Text>
          ))
        )}
      </Card>

      {assessment ? (
        <>
          <SectionHeading>AI Findings</SectionHeading>
          <Card>
            <RiskBadge risk={assessment.overallRisk} />
            {assessment.findings.map((finding) => (
              <Text key={finding.ruleId} style={{ color: theme.colors.text, fontSize: typography.caption, marginTop: 6 }}>
                • {finding.title}
              </Text>
            ))}
            <KeyValueRow label="Confidence" value={`${assessment.confidence}%`} />
          </Card>
        </>
      ) : null}

      <SectionHeading>Education & Follow-up</SectionHeading>
      <Card>
        <KeyValueRow label="VR Education Completed" value={vrCompleted ? 'Yes' : 'No'} />
        <KeyValueRow label="Next Review (WHO schedule)" value={formatDisplayDate(reviewDate)} />
        <KeyValueRow label="Reason" value="Routine ANC" />
      </Card>

      <Button title="Finish & Schedule Follow-up" icon="checkmark-done-outline" variant="success" onPress={handleFinish} />
      <Button title="Back" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
