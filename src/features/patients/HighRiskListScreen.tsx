import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { Card, EmptyState, RiskBadge, Screen, ScreenTitle } from '@/components/ui';
import { HighRiskEntry, listHighRiskPatients } from '@/services/assessments';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';
import { formatDisplayDate } from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function HighRiskListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const [entries, setEntries] = useState<HighRiskEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      setEntries(listHighRiskPatients());
    }, [])
  );

  return (
    <Screen>
      <ScreenTitle subtitle="Patients whose most recent AI assessment was HIGH RISK.">High-Risk Patients</ScreenTitle>
      {entries.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No High-Risk Patients"
          message="No patient currently has a high-risk assessment."
        />
      ) : (
        entries.map(({ assessment, patientName }) => (
          <Card
            key={assessment.id}
            onPress={() => navigation.navigate('PatientDetail', { patientId: assessment.patientId })}
          >
            <Text style={{ fontSize: typography.cardTitle, fontWeight: '600', color: theme.colors.text }}>
              {patientName}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: spacing.xs }}>
              Assessed {formatDisplayDate(assessment.generatedAt.slice(0, 10))} ·{' '}
              {assessment.findings[0]?.title ?? 'High risk'}
            </Text>
            <RiskBadge risk="high" />
          </Card>
        ))
      )}
    </Screen>
  );
}
