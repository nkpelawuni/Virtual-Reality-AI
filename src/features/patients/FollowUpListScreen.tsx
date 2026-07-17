import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Text } from 'react-native';

import { Card, EmptyState, Screen, ScreenTitle } from '@/components/ui';
import { DueFollowUp, listUpcomingFollowUps } from '@/services/referrals';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme/theme';
import { formatDisplayDate, toIsoDate } from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function FollowUpListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const [followUps, setFollowUps] = useState<DueFollowUp[]>([]);

  useFocusEffect(
    useCallback(() => {
      setFollowUps(listUpcomingFollowUps());
    }, [])
  );

  const today = toIsoDate(new Date());

  return (
    <Screen>
      <ScreenTitle subtitle="Scheduled review visits following the WHO eight-contact ANC model.">
        Follow-up Visits
      </ScreenTitle>
      {followUps.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No Follow-ups Scheduled" message="Completed consultations automatically schedule the next review." />
      ) : (
        followUps.map((followUp) => {
          const overdue = followUp.dueDate < today;
          return (
            <Card
              key={followUp.id}
              onPress={() => navigation.navigate('PatientDetail', { patientId: followUp.patientId })}
            >
              <Text style={{ fontSize: typography.cardTitle, fontWeight: '600', color: theme.colors.text }}>
                {followUp.patientName}
              </Text>
              <Text style={{ fontSize: typography.caption, color: overdue ? theme.colors.danger : theme.colors.textSecondary }}>
                {overdue ? 'OVERDUE — ' : ''}
                {formatDisplayDate(followUp.dueDate)} · {followUp.reason}
              </Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
