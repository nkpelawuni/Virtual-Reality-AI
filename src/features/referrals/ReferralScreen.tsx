import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button, Card, Field, KeyValueRow, Screen, ScreenTitle, SegmentedControl } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getAssessment } from '@/services/assessments';
import { getPatient } from '@/services/patients';
import { createReferral } from '@/services/referrals';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme/theme';
import { RiskLevel } from '@/types';
import { formatDisplayDate, toIsoDate } from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'Referral'>;

export function ReferralScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const patient = getPatient(route.params.patientId);
  const assessment = route.params.assessmentId ? getAssessment(route.params.assessmentId) : null;

  const [reason, setReason] = useState(route.params.suggestedReason ?? '');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(assessment?.overallRisk ?? 'high');
  const [receivingFacility, setReceivingFacility] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!patient || !user) {
    return (
      <Screen>
        <Text style={{ color: theme.colors.danger }}>Patient not found.</Text>
      </Screen>
    );
  }

  const handleCreate = () => {
    setError(null);
    if (!reason.trim()) {
      setError('Please state the reason for referral.');
      return;
    }
    createReferral(user, {
      patientId: patient.id,
      visitId: route.params.visitId ?? null,
      assessmentId: route.params.assessmentId ?? null,
      reason: reason.trim(),
      riskLevel,
      notes: notes.trim(),
      receivingFacility: receivingFacility.trim(),
    });
    Alert.alert(
      'Referral Created',
      'The referral form has been generated and stored. It will synchronize when internet is available and can be printed or exported.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <Screen>
      <ScreenTitle subtitle="Generated automatically from the consultation — review and complete before sending.">
        Referral Form
      </ScreenTitle>

      <Card>
        <KeyValueRow label="Patient" value={patient.fullName} />
        <KeyValueRow label="Date" value={formatDisplayDate(toIsoDate(new Date()))} />
        <KeyValueRow label="Referring Provider" value={user.fullName} />
        {assessment ? (
          <KeyValueRow label="AI Risk Level" value={assessment.overallRisk.toUpperCase()} />
        ) : null}
      </Card>

      <Card>
        <Field label="Reason for Referral *" value={reason} onChangeText={setReason} multiline />
        <SegmentedControl
          label="Urgency / Risk Level"
          value={riskLevel}
          onChange={setRiskLevel}
          options={[
            { value: 'moderate', label: 'Moderate' },
            { value: 'high', label: 'High / Urgent' },
          ]}
        />
        <Field
          label="Receiving Facility"
          value={receivingFacility}
          onChangeText={setReceivingFacility}
          placeholder="e.g. Tamale Teaching Hospital"
        />
        <Field
          label="Clinical Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Findings, treatment given, condition on departure…"
        />
        {error ? (
          <Text style={{ color: theme.colors.danger, fontSize: typography.caption, marginBottom: 8 }}>{error}</Text>
        ) : null}
        <Button title="Create Referral" icon="git-branch-outline" variant="danger" onPress={handleCreate} />
        <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </Screen>
  );
}
