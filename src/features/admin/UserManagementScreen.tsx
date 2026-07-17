import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, Screen, ScreenTitle } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getFacility } from '@/services/facilities';
import { adminResetPassword, listUsers, setUserStatus } from '@/services/users';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';
import { User } from '@/types';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function UserManagementScreen() {
  const { theme } = useTheme();
  const { user: admin } = useAuth();
  const navigation = useNavigation<Nav>();
  const [users, setUsers] = useState<User[]>([]);

  const refresh = useCallback(() => setUsers(listUsers()), []);
  useFocusEffect(refresh);

  const handleToggleStatus = (target: User) => {
    if (!admin) return;
    if (target.id === admin.id) {
      Alert.alert('Not Allowed', 'You cannot suspend your own account.');
      return;
    }
    const suspending = target.status === 'active';
    Alert.alert(
      suspending ? 'Suspend User' : 'Reactivate User',
      `${suspending ? 'Suspend' : 'Reactivate'} ${target.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: suspending ? 'Suspend' : 'Reactivate',
          style: suspending ? 'destructive' : 'default',
          onPress: () => {
            setUserStatus(admin, target.id, suspending ? 'suspended' : 'active');
            refresh();
          },
        },
      ]
    );
  };

  const handleResetPassword = (target: User) => {
    if (!admin) return;
    const temporary = `Reset@${Math.floor(1000 + Math.random() * 9000)}`;
    Alert.alert('Reset Password', `Set a temporary password for ${target.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          const error = await adminResetPassword(admin, target.id, temporary);
          Alert.alert(
            error ? 'Reset Failed' : 'Password Reset',
            error ?? `Temporary password: ${temporary}\nAsk the user to change it after logging in.`
          );
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScreenTitle subtitle="Create accounts, manage access and reset passwords.">User Management</ScreenTitle>
      <Button title="Create User Account" icon="person-add-outline" onPress={() => navigation.navigate('UserForm')} />

      {users.length === 0 ? (
        <EmptyState icon="people-outline" title="No Users" message="Create the first healthcare worker account." />
      ) : (
        users.map((item) => {
          const facility = getFacility(item.facilityId);
          const suspended = item.status === 'suspended';
          return (
            <Card key={item.id}>
              <View style={styles.row}>
                {item.avatarUri ? (
                  <Image source={{ uri: item.avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
                    <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ fontSize: typography.body, fontWeight: '600', color: suspended ? theme.colors.textSecondary : theme.colors.text }}>
                    {item.fullName} {suspended ? '(suspended)' : ''}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                    {item.username} · {item.role === 'admin' ? 'Administrator' : 'Healthcare Worker'}
                    {facility ? ` · ${facility.name}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Button
                  title={suspended ? 'Reactivate' : 'Suspend'}
                  variant={suspended ? 'success' : 'danger'}
                  style={{ flex: 1 }}
                  onPress={() => handleToggleStatus(item)}
                />
                <Button title="Reset Password" variant="secondary" style={{ flex: 1 }} onPress={() => handleResetPassword(item)} />
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
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
