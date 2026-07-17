import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, KeyValueRow, RiskBadge, Screen, SectionHeading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getLatestAssessmentForPatient } from '@/services/assessments';
import { getPatient, MEDICAL_HISTORY_LABELS, updatePatientPhoto } from '@/services/patients';
import { listReferralsForPatient } from '@/services/referrals';
import { listVisitsForPatient } from '@/services/visits';
import { MediaPicker } from '@/components/MediaPicker';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';
import { AncVisit, MedicalHistory, Patient } from '@/types';
import {
  ageFromDob,
  eddFromLmp,
  formatDisplayDate,
  formatGestationalAge,
  gestationalAgeFromLmp,
} from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'PatientDetail'>;

export function PatientDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<AncVisit[]>([]);
  const [editingPhoto, setEditingPhoto] = useState(false);

  const refresh = useCallback(() => {
    setPatient(getPatient(route.params.patientId));
    setVisits(listVisitsForPatient(route.params.patientId));
  }, [route.params.patientId]);

  useFocusEffect(refresh);

  if (!patient) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Patient Not Found" message="This record may have been removed." />
      </Screen>
    );
  }

  const ga = patient.lmp ? gestationalAgeFromLmp(patient.lmp) : null;
  const edd = patient.lmp ? eddFromLmp(patient.lmp) : null;
  const assessment = getLatestAssessmentForPatient(patient.id);
  const referrals = listReferralsForPatient(patient.id);
  const historyItems = (Object.keys(MEDICAL_HISTORY_LABELS) as Array<keyof MedicalHistory>).filter(
    (key) => patient.medicalHistory[key]
  );

  return (
    <Screen>
      <Card>
        <View style={styles.headerRow}>
          {patient.photoUri ? (
            <Image source={{ uri: patient.photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
              <Ionicons name="person" size={32} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontSize: typography.screenTitle, fontWeight: '700', color: theme.colors.text }}>
              {patient.fullName}
            </Text>
            <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary }}>
              {ageFromDob(patient.dateOfBirth) ?? '—'} years · {formatGestationalAge(ga)}
            </Text>
            <View style={{ marginTop: spacing.xs }}>
              <RiskBadge risk={assessment?.overallRisk ?? 'low'} />
            </View>
          </View>
        </View>
        {editingPhoto ? (
          <MediaPicker
            label="Update Patient Photo"
            kind="image"
            ownerType="patient_photo"
            ownerId={patient.id}
            value={patient.photoUri}
            onChange={(uri) => {
              if (user) updatePatientPhoto(user, patient.id, uri);
              setEditingPhoto(false);
              refresh();
            }}
            shape="circle"
            allowCamera
          />
        ) : (
          <Button
            title={patient.photoUri ? 'Change Photo' : 'Add Photo'}
            variant="secondary"
            icon="camera-outline"
            onPress={() => setEditingPhoto(true)}
          />
        )}
      </Card>

      <Button
        title="Start New ANC Visit"
        icon="medkit-outline"
        onPress={() => navigation.navigate('Consultation', { patientId: patient.id })}
      />

      <SectionHeading>Pregnancy Summary</SectionHeading>
      <Card>
        <KeyValueRow label="Gravidity" value={patient.gravidity != null ? String(patient.gravidity) : '—'} />
        <KeyValueRow label="Parity" value={patient.parity != null ? String(patient.parity) : '—'} />
        <KeyValueRow label="LMP" value={formatDisplayDate(patient.lmp)} />
        <KeyValueRow label="Gestational Age" value={formatGestationalAge(ga)} />
        <KeyValueRow label="Expected Date of Delivery" value={formatDisplayDate(edd)} />
        <KeyValueRow label="Phone" value={patient.phone || '—'} />
        <KeyValueRow label="NHIS Number" value={patient.nhisNumber ?? '—'} />
        <KeyValueRow
          label="Emergency Contact"
          value={patient.emergencyContactName ? `${patient.emergencyContactName} (${patient.emergencyContactPhone || 'no phone'})` : '—'}
        />
      </Card>

      {historyItems.length > 0 ? (
        <>
          <SectionHeading>Medical History</SectionHeading>
          <Card>
            {historyItems.map((key) => (
              <View key={key} style={styles.historyRow}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
                <Text style={{ marginLeft: spacing.sm, color: theme.colors.text, fontSize: typography.caption }}>
                  {MEDICAL_HISTORY_LABELS[key]}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeading>ANC Visit History</SectionHeading>
      {visits.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No Visits Yet" message="Start the first ANC consultation for this patient." />
      ) : (
        visits.map((visit) => (
          <Card
            key={visit.id}
            onPress={() =>
              visit.status === 'draft'
                ? navigation.navigate('Consultation', { patientId: patient.id, visitId: visit.id })
                : navigation.navigate('ConsultationSummary', { visitId: visit.id })
            }
          >
            <View style={styles.visitRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: typography.body, fontWeight: '600', color: theme.colors.text }}>
                  {formatDisplayDate(visit.visitDate)}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                  {visit.gestationalAgeWeeks != null ? `${visit.gestationalAgeWeeks} weeks` : 'GA unknown'} ·{' '}
                  {visit.status === 'draft' ? 'Draft — tap to continue' : 'Completed'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
            </View>
          </Card>
        ))
      )}

      {referrals.length > 0 ? (
        <>
          <SectionHeading>Referrals</SectionHeading>
          {referrals.map((referral) => (
            <Card key={referral.id}>
              <Text style={{ fontSize: typography.body, fontWeight: '600', color: theme.colors.text }}>
                {referral.reason}
              </Text>
              <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                {formatDisplayDate(referral.referralDate)} → {referral.receivingFacility || 'Receiving facility TBD'} · {referral.status}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
