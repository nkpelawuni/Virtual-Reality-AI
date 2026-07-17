import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, Field, Screen, ScreenTitle, SegmentedControl } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { listFacilities } from '@/services/facilities';
import { createUser } from '@/services/users';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme/theme';
import { UserRole } from '@/types';

export function UserFormScreen() {
  const { theme } = useTheme();
  const { user: admin } = useAuth();
  const navigation = useNavigation();
  const facilities = listFacilities();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('healthcare_worker');
  const [facilityId, setFacilityId] = useState<string | undefined>(facilities[0]?.id);
  const [password, setPassword] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setError(null);
    if (!admin) return;
    if (!fullName.trim() || !username.trim() || !email.trim()) {
      setError('Full name, username and email are required.');
      return;
    }
    setBusy(true);
    const result = await createUser(admin, {
      fullName,
      username,
      email,
      role,
      facilityId: facilityId ?? null,
      password,
      avatarUri,
    });
    setBusy(false);
    if (result) {
      setError(result);
      return;
    }
    Alert.alert('User Created', `${fullName} can now log in with the username "${username.trim()}".`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <Screen>
      <ScreenTitle>Create User Account</ScreenTitle>
      <Card>
        <MediaPicker
          label="Profile Photo (optional)"
          kind="image"
          ownerType="user_avatar"
          value={avatarUri}
          onChange={setAvatarUri}
          shape="circle"
          allowCamera
        />
        <Field label="Full Name *" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
        <Field label="Username *" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Field label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <SegmentedControl
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: 'healthcare_worker', label: 'Healthcare Worker' },
            { value: 'admin', label: 'Administrator' },
          ]}
        />
        {facilities.length > 0 ? (
          <SegmentedControl
            label="Facility"
            value={facilityId}
            onChange={setFacilityId}
            options={facilities.map((facility) => ({ value: facility.id, label: facility.name }))}
          />
        ) : null}
        <Field
          label="Initial Password *"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          helper="At least 8 characters with uppercase, lowercase, a number and a special character."
        />
        {error ? (
          <Text style={{ color: theme.colors.danger, fontSize: typography.caption, marginBottom: 8 }}>{error}</Text>
        ) : null}
        <Button title="Create Account" icon="person-add-outline" onPress={handleCreate} loading={busy} />
        <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </Screen>
  );
}
