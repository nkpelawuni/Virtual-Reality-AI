import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, EmptyState, Screen, ScreenTitle } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { FACILITY_TYPE_LABELS, listFacilities, updateFacilityLogo } from '@/services/facilities';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import { Facility } from '@/types';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function FacilityManagementScreen() {
  const { theme } = useTheme();
  const { user: admin } = useAuth();
  const navigation = useNavigation<Nav>();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [editingLogoFor, setEditingLogoFor] = useState<string | null>(null);

  const refresh = useCallback(() => setFacilities(listFacilities()), []);
  useFocusEffect(refresh);

  return (
    <Screen>
      <ScreenTitle subtitle="Hospitals, health centres and CHPS compounds. Upload each facility's logo for reports and dashboards.">
        Facility Management
      </ScreenTitle>
      <Button title="Add Facility" icon="business-outline" onPress={() => navigation.navigate('FacilityForm')} />

      {facilities.length === 0 ? (
        <EmptyState icon="business-outline" title="No Facilities" message="Add the first facility to assign healthcare workers." />
      ) : (
        facilities.map((facility) => (
          <Card key={facility.id}>
            <View style={styles.row}>
              {facility.logoUri ? (
                <Image source={{ uri: facility.logoUri }} style={styles.logo} resizeMode="contain" />
              ) : (
                <View style={[styles.logo, styles.logoFallback, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
                  <Ionicons name="business" size={22} color={theme.colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ fontSize: typography.body, fontWeight: '600', color: theme.colors.text }}>
                  {facility.name}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {FACILITY_TYPE_LABELS[facility.type]} · {facility.district}, {facility.region}
                </Text>
              </View>
            </View>
            {editingLogoFor === facility.id ? (
              <View style={{ marginTop: spacing.sm }}>
                <MediaPicker
                  label="Facility Logo"
                  kind="image"
                  ownerType="facility_logo"
                  ownerId={facility.id}
                  value={facility.logoUri}
                  onChange={(uri) => {
                    if (admin) updateFacilityLogo(admin, facility.id, uri);
                    setEditingLogoFor(null);
                    refresh();
                  }}
                  helper="Shown on dashboards, referral forms and reports."
                />
              </View>
            ) : (
              <Button
                title={facility.logoUri ? 'Change Logo' : 'Upload Logo'}
                variant="secondary"
                icon="image-outline"
                onPress={() => setEditingLogoFor(facility.id)}
              />
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
