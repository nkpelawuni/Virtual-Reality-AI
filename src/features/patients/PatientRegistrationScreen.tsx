import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, CheckboxRow, Field, Screen, ScreenTitle, SectionHeading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { createPatient, EMPTY_MEDICAL_HISTORY, MEDICAL_HISTORY_LABELS } from '@/services/patients';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme/theme';
import { MedicalHistory } from '@/types';
import {
  ageFromDob,
  eddFromLmp,
  formatDisplayDate,
  formatGestationalAge,
  gestationalAgeFromLmp,
  isValidIsoDate,
} from '@/utils/calculations';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function PatientRegistrationScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [nhisNumber, setNhisNumber] = useState('');
  const [gravidity, setGravidity] = useState('');
  const [parity, setParity] = useState('');
  const [lmp, setLmp] = useState('');
  const [history, setHistory] = useState<MedicalHistory>(EMPTY_MEDICAL_HISTORY);
  const [error, setError] = useState<string | null>(null);

  // Automated antenatal calculations (§4.6): GA and EDD update live from LMP.
  const ga = useMemo(() => (isValidIsoDate(lmp) ? gestationalAgeFromLmp(lmp) : null), [lmp]);
  const edd = useMemo(() => (isValidIsoDate(lmp) ? eddFromLmp(lmp) : null), [lmp]);
  const age = useMemo(() => (isValidIsoDate(dateOfBirth) ? ageFromDob(dateOfBirth) : null), [dateOfBirth]);

  const toggleHistory = (key: keyof MedicalHistory) =>
    setHistory((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    setError(null);
    if (!user) return;
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!isValidIsoDate(dateOfBirth)) {
      setError('Enter the date of birth as YYYY-MM-DD.');
      return;
    }
    if (lmp && !isValidIsoDate(lmp)) {
      setError('Enter the LMP as YYYY-MM-DD.');
      return;
    }
    const patient = createPatient(user, {
      photoUri,
      fullName,
      dateOfBirth,
      phone,
      address,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      nationalId: nationalId.trim() || null,
      nhisNumber: nhisNumber.trim() || null,
      gravidity: gravidity ? Number(gravidity) : null,
      parity: parity ? Number(parity) : null,
      lmp: lmp || null,
      medicalHistory: history,
    });
    Alert.alert('Patient Registered', `${patient.fullName} has been registered successfully.`, [
      {
        text: 'Start ANC Consultation',
        onPress: () => navigation.replace('Consultation', { patientId: patient.id }),
      },
      { text: 'Done', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <Screen>
      <ScreenTitle subtitle="All information is stored securely on this device and synchronized when online.">
        New Patient Registration
      </ScreenTitle>

      <SectionHeading>Personal Information</SectionHeading>
      <Card>
        <MediaPicker
          label="Patient Photo (optional)"
          kind="image"
          ownerType="patient_photo"
          value={photoUri}
          onChange={setPhotoUri}
          shape="circle"
          allowCamera
          helper="A photo helps identify the patient quickly during search."
        />
        <Field label="Full Name *" value={fullName} onChangeText={setFullName} placeholder="e.g. Mary Ibrahim" autoCapitalize="words" />
        <Field
          label="Date of Birth *"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          helper={age != null ? `Age: ${age} years (calculated automatically)` : undefined}
        />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="e.g. 024 000 0000" />
        <Field label="Address / Community" value={address} onChangeText={setAddress} placeholder="e.g. Sagnarigu" />
        <Field label="Emergency Contact Name" value={emergencyName} onChangeText={setEmergencyName} autoCapitalize="words" />
        <Field label="Emergency Contact Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" />
        <Field label="National ID (optional)" value={nationalId} onChangeText={setNationalId} autoCapitalize="none" />
        <Field label="NHIS Number (optional)" value={nhisNumber} onChangeText={setNhisNumber} autoCapitalize="none" />
      </Card>

      <SectionHeading>Pregnancy Information</SectionHeading>
      <Card>
        <Field label="Gravidity" value={gravidity} onChangeText={setGravidity} keyboardType="number-pad" placeholder="Total pregnancies" />
        <Field label="Parity" value={parity} onChangeText={setParity} keyboardType="number-pad" placeholder="Previous deliveries" />
        <Field
          label="LMP — Last Menstrual Period"
          value={lmp}
          onChangeText={setLmp}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />
        <View style={{ marginTop: spacing.xs }}>
          <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary }}>
            Gestational Age (auto): <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{formatGestationalAge(ga)}</Text>
          </Text>
          <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginTop: 4 }}>
            Expected Date of Delivery (auto): <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{formatDisplayDate(edd)}</Text>
          </Text>
        </View>
      </Card>

      <SectionHeading>Medical History</SectionHeading>
      <Card>
        {(Object.keys(MEDICAL_HISTORY_LABELS) as Array<keyof MedicalHistory>).map((key) => (
          <CheckboxRow
            key={key}
            label={MEDICAL_HISTORY_LABELS[key]}
            checked={history[key]}
            onToggle={() => toggleHistory(key)}
          />
        ))}
      </Card>

      {error ? (
        <Text style={{ color: theme.colors.danger, marginBottom: spacing.sm, fontSize: typography.caption }}>
          {error}
        </Text>
      ) : null}
      <Button title="Save Patient" icon="save-outline" onPress={handleSave} />
      <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
