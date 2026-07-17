import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, ScreenTitle, StatCard } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { countHighRiskPatients } from '@/services/assessments';
import { db } from '@/services/database';
import { countPatients } from '@/services/patients';
import { getSyncStatus } from '@/services/sync';
import { countVisitsToday } from '@/services/visits';
import { countVrSessions } from '@/services/vr';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function AdminDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState({
    facilities: 0,
    personnel: 0,
    patients: 0,
    highRisk: 0,
    visitsToday: 0,
    vrSessions: 0,
    pendingSync: 0,
  });

  useFocusEffect(
    useCallback(() => {
      const facilityCount = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM facilities')?.n ?? 0;
      const personnelCount =
        db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'healthcare_worker'")?.n ?? 0;
      const sync = getSyncStatus();
      setStats({
        facilities: facilityCount,
        personnel: personnelCount,
        patients: countPatients(),
        highRisk: countHighRiskPatients(),
        visitsToday: countVisitsToday(),
        vrSessions: countVrSessions(),
        pendingSync: sync.pendingRecords + sync.pendingMedia,
      });
    }, [])
  );

  return (
    <Screen>
      <ScreenTitle subtitle={user?.fullName ?? ''}>Administrator Dashboard</ScreenTitle>

      <View style={styles.row}>
        <StatCard label="Facilities" value={stats.facilities} icon="business" />
        <StatCard label="Healthcare Personnel" value={stats.personnel} icon="people" />
      </View>
      <View style={styles.row}>
        <StatCard label="Registered Patients" value={stats.patients} icon="woman" tone="success" />
        <StatCard label="High-Risk Pregnancies" value={stats.highRisk} icon="warning" tone="danger" />
      </View>
      <View style={styles.row}>
        <StatCard label="ANC Visits Today" value={stats.visitsToday} icon="calendar" />
        <StatCard label="VR Sessions" value={stats.vrSessions} icon="glasses" tone="success" />
      </View>

      <Card>
        <Text style={{ fontSize: typography.body, fontWeight: '600', color: theme.colors.text }}>
          System Health
        </Text>
        <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginTop: 4 }}>
          Local database operational · {stats.pendingSync} record{stats.pendingSync === 1 ? '' : 's'} pending
          synchronization
        </Text>
      </Card>

      <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Administration</Text>
      <Button title="Audit Logs" icon="document-text-outline" variant="secondary" onPress={() => navigation.navigate('AuditLogs')} />
      <Button title="Branding & App Logo" icon="color-palette-outline" variant="secondary" onPress={() => navigation.navigate('Branding')} />
      <Button title="Project Team" icon="people-circle-outline" variant="secondary" onPress={() => navigation.navigate('Team')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sectionHeading,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
