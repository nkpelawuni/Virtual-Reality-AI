/**
 * Splash screen (§4.2): logo, name, tagline and loading indicator while the
 * session is restored. Shown for the brief period before auth state resolves.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { getBrandLogoUri, getBrandName } from '@/services/branding';
import { palette, spacing } from '@/theme/theme';

export function SplashScreen() {
  let logoUri: string | null = null;
  try {
    logoUri = getBrandLogoUri();
  } catch {
    // Database may not be ready on the very first frame — fall back to default mark.
  }

  return (
    <View style={styles.container}>
      {logoUri ? (
        <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
      ) : (
        <View style={styles.logoFallback}>
          <Ionicons name="heart" size={48} color={palette.primary} />
        </View>
      )}
      <Text style={styles.title}>{getBrandName()}</Text>
      <Text style={styles.tagline}>AI-Assisted Maternal Care</Text>
      <ActivityIndicator color="#fff" style={{ marginTop: spacing.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  logoFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    marginTop: spacing.xs,
  },
});
