import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, EmptyState, RiskBadge, Screen } from '@/components/ui';
import { getLatestAssessmentForPatient } from '@/services/assessments';
import { searchPatients } from '@/services/patients';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import { Patient } from '@/types';
import {
  ageFromDob,
  formatDisplayDate,
  formatGestationalAge,
  gestationalAgeFromLmp,
} from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function PatientSearchScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);

  const refresh = useCallback(() => {
    setResults(searchPatients(query));
  }, [query]);

  useFocusEffect(refresh);

  const renderPatient = ({ item }: { item: Patient }) => {
    const ga = item.lmp ? gestationalAgeFromLmp(item.lmp) : null;
    const assessment = getLatestAssessmentForPatient(item.id);
    return (
      <Card onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}>
        <View style={styles.row}>
          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
              <Ionicons name="person" size={24} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontSize: typography.cardTitle, fontWeight: '600', color: theme.colors.text }}>
              {item.fullName}
            </Text>
            <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary }}>
              {ageFromDob(item.dateOfBirth) ?? '—'} years · {formatGestationalAge(ga)} · Last update{' '}
              {formatDisplayDate(item.updatedAt.slice(0, 10))}
            </Text>
            <View style={{ marginTop: spacing.xs }}>
              <RiskBadge risk={assessment?.overallRisk ?? 'low'} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </View>
      </Card>
    );
  };

  return (
    <Screen scroll={false}>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border },
        ]}
      >
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setResults(searchPatients(text));
          }}
          placeholder="Name, phone, Patient ID, NHIS or National ID"
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.searchInput, { color: theme.colors.text }]}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderPatient}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No Patients Found"
            message="Register a new patient to begin."
          />
        }
      />
      <Button
        title="Register New Patient"
        icon="person-add-outline"
        onPress={() => navigation.navigate('PatientRegistration')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: spacing.sm,
    fontSize: typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
