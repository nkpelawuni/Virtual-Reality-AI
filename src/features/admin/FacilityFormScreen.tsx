import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, Field, Screen, ScreenTitle, SegmentedControl } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { createFacility } from '@/services/facilities';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme/theme';
import { FacilityType } from '@/types';

export function FacilityFormScreen() {
  const { theme } = useTheme();
  const { user: admin } = useAuth();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [type, setType] = useState<FacilityType>('chps_compound');
  const [district, setDistrict] = useState('');
  const [region, setRegion] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    if (!admin) return;
    if (!name.trim()) {
      setError('Facility name is required.');
      return;
    }
    const facility = createFacility(admin, { name, type, district, region, logoUri });
    Alert.alert('Facility Created', `${facility.name} has been added.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <Screen>
      <ScreenTitle>Add Facility</ScreenTitle>
      <Card>
        <Field label="Facility Name *" value={name} onChangeText={setName} autoCapitalize="words" />
        <SegmentedControl
          label="Facility Type"
          value={type}
          onChange={setType}
          options={[
            { value: 'hospital', label: 'Hospital' },
            { value: 'health_centre', label: 'Health Centre' },
            { value: 'chps_compound', label: 'CHPS Compound' },
          ]}
        />
        <Field label="District" value={district} onChangeText={setDistrict} autoCapitalize="words" />
        <Field label="Region" value={region} onChangeText={setRegion} autoCapitalize="words" />
        <MediaPicker
          label="Facility Logo (optional)"
          kind="image"
          ownerType="facility_logo"
          value={logoUri}
          onChange={setLogoUri}
          helper="Shown on dashboards, referral forms and reports."
        />
        {error ? (
          <Text style={{ color: theme.colors.danger, fontSize: typography.caption, marginBottom: 8 }}>{error}</Text>
        ) : null}
        <Button title="Create Facility" icon="business-outline" onPress={handleCreate} />
        <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </Screen>
  );
}
