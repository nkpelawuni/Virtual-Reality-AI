import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { MainStackParamList } from '@/navigation/types';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, Field, KeyValueRow, Screen, ScreenTitle, SectionHeading, SegmentedControl } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { changePassword, updateAvatar } from '@/services/auth';
import { getFacility } from '@/services/facilities';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';

export function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) return null;
  const facility = getFacility(user.facilityId);

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    const error = await changePassword(user, currentPassword, newPassword);
    if (error) {
      setPasswordError(error);
      return;
    }
    setChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    Alert.alert('Password Changed', 'Your password has been updated.');
  };

  return (
    <Screen>
      <ScreenTitle>Profile</ScreenTitle>

      <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        {user.avatarUri ? (
          <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person" size={40} color={theme.colors.onPrimary} />
          </View>
        )}
        <Text style={{ fontSize: typography.cardTitle, fontWeight: '700', color: theme.colors.text, marginTop: spacing.sm }}>
          {user.fullName}
        </Text>
        <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary }}>
          {user.role === 'admin' ? 'System Administrator' : 'Healthcare Worker'}
          {facility ? ` · ${facility.name}` : ''}
        </Text>
        {editingAvatar ? (
          <View style={{ width: '100%', marginTop: spacing.md }}>
            <MediaPicker
              label="Profile Photo"
              kind="image"
              ownerType="user_avatar"
              ownerId={user.id}
              value={user.avatarUri}
              onChange={(uri) => {
                updateAvatar(user, uri);
                refreshUser();
                setEditingAvatar(false);
              }}
              shape="circle"
              allowCamera
            />
          </View>
        ) : (
          <Button
            title={user.avatarUri ? 'Change Photo' : 'Upload Photo'}
            variant="secondary"
            icon="camera-outline"
            onPress={() => setEditingAvatar(true)}
            style={{ marginTop: spacing.sm }}
          />
        )}
      </Card>

      <SectionHeading>Account</SectionHeading>
      <Card>
        <KeyValueRow label="Username" value={user.username} />
        <KeyValueRow label="Email" value={user.email} />
      </Card>

      <SectionHeading>Appearance</SectionHeading>
      <Card>
        <SegmentedControl
          label="Theme"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </Card>

      <SectionHeading>Security</SectionHeading>
      {changingPassword ? (
        <Card>
          <Field label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" />
          <Field
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            helper="At least 8 characters with uppercase, lowercase, a number and a special character."
          />
          <Field label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
          {passwordError ? (
            <Text style={{ color: theme.colors.danger, fontSize: typography.caption, marginBottom: spacing.sm }}>
              {passwordError}
            </Text>
          ) : null}
          <Button title="Save New Password" icon="key-outline" onPress={handleChangePassword} />
          <Button title="Cancel" variant="secondary" onPress={() => setChangingPassword(false)} />
        </Card>
      ) : (
        <Button title="Change Password" variant="secondary" icon="key-outline" onPress={() => setChangingPassword(true)} />
      )}

      <SectionHeading>About</SectionHeading>
      <Button
        title="Project Team"
        variant="secondary"
        icon="people-circle-outline"
        onPress={() => navigation.navigate('Team')}
      />

      <Button
        title="Log Out"
        variant="danger"
        icon="log-out-outline"
        onPress={() =>
          Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: () => logout() },
          ])
        }
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
});
