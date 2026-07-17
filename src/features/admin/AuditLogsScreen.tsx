import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Screen, ScreenTitle } from '@/components/ui';
import { listAuditLogs } from '@/services/audit';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';
import { AuditLog } from '@/types';

export function AuditLogsScreen() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      setLogs(listAuditLogs(200));
    }, [])
  );

  return (
    <Screen>
      <ScreenTitle subtitle="Every significant system activity, recorded with user, device and timestamp (§10.8).">
        Audit Logs
      </ScreenTitle>
      {logs.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No Activity Yet" message="System activity will appear here." />
      ) : (
        logs.map((log) => (
          <Card key={log.id} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={{ fontSize: typography.caption, fontWeight: '700', color: theme.colors.primary }}>
                {log.action}
              </Text>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                {new Date(log.createdAt).toLocaleString()}
              </Text>
            </View>
            {log.detail ? (
              <Text style={{ fontSize: typography.caption, color: theme.colors.text, marginTop: 2 }}>
                {log.detail}
              </Text>
            ) : null}
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4 }}>
              {log.username} · device {log.deviceId.slice(0, 8)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logCard: {
    paddingVertical: spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
