/**
 * Branding (§8.20): the administrator uploads the organisation's application
 * logo, which then appears on the splash screen, login screen and dashboards.
 */
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Text } from 'react-native';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, Screen, ScreenTitle } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getBrandLogoUri, setBrandLogoUri } from '@/services/branding';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme/theme';

export function BrandingScreen() {
  const { theme } = useTheme();
  const { user: admin } = useAuth();
  const navigation = useNavigation();
  const [logoUri, setLogoUri] = useState<string | null>(getBrandLogoUri());

  return (
    <Screen>
      <ScreenTitle subtitle="The uploaded logo appears on the splash screen, login screen and dashboards.">
        Branding & App Logo
      </ScreenTitle>
      <Card>
        <MediaPicker
          label="Application Logo"
          kind="image"
          ownerType="app_logo"
          value={logoUri}
          onChange={(uri) => {
            setLogoUri(uri);
            if (admin) setBrandLogoUri(admin, uri);
          }}
          helper="PNG with transparent background recommended, at least 512×512 px."
        />
        <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary }}>
          Branding changes take effect immediately across the application and are recorded in the audit log.
        </Text>
      </Card>
      <Button title="Done" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
