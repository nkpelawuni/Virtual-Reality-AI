import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Screen } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getBrandLogoUri, getBrandName } from '@/services/branding';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';
import { AuthStackParamList } from '@/navigation/types';

export function LoginScreen() {
  const { theme } = useTheme();
  const { login } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logoUri = getBrandLogoUri();

  const handleLogin = async () => {
    setError(null);
    if (!identifier.trim()) {
      setError('Please enter your username or email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setBusy(true);
    const result = await login(identifier, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <Screen>
      <View style={styles.header}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="heart" size={40} color={theme.colors.onPrimary} />
          </View>
        )}
        <Text style={[styles.appName, { color: theme.colors.text }]}>{getBrandName()}</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: typography.caption }}>
          AI-Assisted Maternal Care
        </Text>
      </View>

      <Card>
        <Field
          label="Username or Email"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="e.g. midwife"
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
        />
        {error ? (
          <Text style={{ color: theme.colors.danger, marginBottom: spacing.sm, fontSize: typography.caption }}>
            {error}
          </Text>
        ) : null}
        <Button title="Login" onPress={handleLogin} loading={busy} icon="log-in-outline" />
        <Button
          title="Forgot Password"
          variant="secondary"
          onPress={() => navigation.navigate('ForgotPassword')}
        />
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
          Demo accounts — Healthcare Worker: midwife / Midwife@2026 · Administrator: admin / Admin@2026
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: spacing.sm,
  },
  logoFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
  },
});
