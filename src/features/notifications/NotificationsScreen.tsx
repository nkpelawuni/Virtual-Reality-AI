/**
 * Notifications (§4.14 / §8.14): colour-coded alerts derived from live data —
 * follow-ups due, high-risk patients awaiting review, and pending sync.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Screen, ScreenTitle } from '@/components/ui';
import { listHighRiskPatients } from '@/services/assessments';
import { listUpcomingFollowUps } from '@/services/referrals';
import { getSyncStatus } from '@/services/sync';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';
import { toIsoDate } from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

type Priority = 'information' | 'reminder' | 'warning' | 'emergency';

interface NotificationItem {
  id: string;
  priority: Priority;
  title: string;
  message: string;
  onPress?: () => void;
}

export function NotificationsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<NotificationItem[]>([]);

  const build = useCallback(() => {
    const list: NotificationItem[] = [];
    const today = toIsoDate(new Date());

    for (const entry of listHighRiskPatients(10)) {
      list.push({
        id: `hr-${entry.assessment.id}`,
        priority: 'emergency',
        title: 'High-risk patient awaiting review',
        message: `${entry.patientName}: ${entry.assessment.findings[0]?.title ?? 'High risk assessment'}`,
        onPress: () => navigation.navigate('PatientDetail', { patientId: entry.assessment.patientId }),
      });
    }
    for (const followUp of listUpcomingFollowUps(10)) {
      const overdue = followUp.dueDate < today;
      const dueToday = followUp.dueDate === today;
      if (overdue || dueToday) {
        list.push({
          id: `fu-${followUp.id}`,
          priority: overdue ? 'warning' : 'reminder',
          title: overdue ? 'Follow-up visit overdue' : 'Follow-up visit due today',
          message: `${followUp.patientName} — ${followUp.reason}`,
          onPress: () => navigation.navigate('PatientDetail', { patientId: followUp.patientId }),
        });
      }
    }
    const sync = getSyncStatus();
    const pending = sync.pendingRecords + sync.pendingMedia;
    if (pending > 0) {
      list.push({
        id: 'sync',
        priority: 'information',
        title: 'Records ready to synchronize',
        message: `${pending} item${pending === 1 ? '' : 's'} will sync when internet connectivity is available.`,
      });
    }
    setItems(list);
  }, [navigation]);

  useFocusEffect(build);

  const priorityConfig: Record<Priority, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    information: { color: theme.colors.primary, icon: 'information-circle' },
    reminder: { color: theme.colors.success, icon: 'alarm' },
    warning: { color: theme.colors.warning, icon: 'warning' },
    emergency: { color: theme.colors.danger, icon: 'alert-circle' },
  };

  return (
    <Screen>
      <ScreenTitle>Notifications</ScreenTitle>
      {items.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="All Caught Up" message="No alerts need your attention right now." />
      ) : (
        items.map((item) => {
          const config = priorityConfig[item.priority];
          return (
            <Card key={item.id} onPress={item.onPress}>
              <View style={styles.row}>
                <Ionicons name={config.icon} size={24} color={config.color} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ fontSize: typography.body, fontWeight: '600', color: theme.colors.text }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginTop: 2 }}>
                    {item.message}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
