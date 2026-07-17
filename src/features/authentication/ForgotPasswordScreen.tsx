import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button, Card, Field, Screen, ScreenTitle } from '@/components/ui';
import { resetPassword } from '@/services/auth';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';

export function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleReset = async () => {
    setError(null);
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await resetPassword(email, newPassword);
    setBusy(false);
    if (result) {
      setError(result);
      return;
    }
    Alert.alert('Password Reset', 'Your password has been updated. Please log in again.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <Screen>
      <ScreenTitle subtitle="Verify your identity with the email registered to your account, then choose a new password.">
        Forgot Password
      </ScreenTitle>
      <Card>
        <Field
          label="Registered Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@facility.org"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          helper="At least 8 characters with uppercase, lowercase, a number and a special character."
        />
        <Field
          label="Confirm New Password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
        />
        {error ? (
          <Text style={{ color: theme.colors.danger, marginBottom: spacing.sm, fontSize: typography.caption }}>
            {error}
          </Text>
        ) : null}
        <Button title="Reset Password" onPress={handleReset} loading={busy} icon="key-outline" />
        <Button title="Back to Login" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </Screen>
  );
}
