import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/theme/ThemeContext';
import { AdminTabParamList, AuthStackParamList, HealthcareTabParamList, MainStackParamList } from './types';

import { ForgotPasswordScreen } from '@/features/authentication/ForgotPasswordScreen';
import { LoginScreen } from '@/features/authentication/LoginScreen';
import { SplashScreen } from '@/features/authentication/SplashScreen';

import { HealthcareDashboard } from '@/features/dashboard/HealthcareDashboard';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';
import { PatientSearchScreen } from '@/features/patients/PatientSearchScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { VrLibraryScreen } from '@/features/vr/VrLibraryScreen';

import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { FacilityManagementScreen } from '@/features/admin/FacilityManagementScreen';
import { UserManagementScreen } from '@/features/admin/UserManagementScreen';
import { VrContentScreen } from '@/features/admin/VrContentScreen';

import { ConsultationScreen } from '@/features/anc/ConsultationScreen';
import { ConsultationSummaryScreen } from '@/features/anc/ConsultationSummaryScreen';
import { AssessmentScreen } from '@/features/ai/AssessmentScreen';
import { AuditLogsScreen } from '@/features/admin/AuditLogsScreen';
import { BrandingScreen } from '@/features/admin/BrandingScreen';
import { FacilityFormScreen } from '@/features/admin/FacilityFormScreen';
import { UserFormScreen } from '@/features/admin/UserFormScreen';
import { VrModuleFormScreen } from '@/features/admin/VrModuleFormScreen';
import { FollowUpListScreen } from '@/features/patients/FollowUpListScreen';
import { HighRiskListScreen } from '@/features/patients/HighRiskListScreen';
import { PatientDetailScreen } from '@/features/patients/PatientDetailScreen';
import { PatientRegistrationScreen } from '@/features/patients/PatientRegistrationScreen';
import { ReferralScreen } from '@/features/referrals/ReferralScreen';
import { TeamScreen } from '@/features/team/TeamScreen';
import { VrPlayerScreen } from '@/features/vr/VrPlayerScreen';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const HealthcareTabs = createBottomTabNavigator<HealthcareTabParamList>();
const AdminTabs = createBottomTabNavigator<AdminTabParamList>();

function HealthcareTabNavigator() {
  const { theme } = useTheme();
  return (
    <HealthcareTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof HealthcareTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Patients: 'people',
            VRLibrary: 'glasses',
            Notifications: 'notifications',
            Profile: 'person-circle',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <HealthcareTabs.Screen name="Home" component={HealthcareDashboard} />
      <HealthcareTabs.Screen name="Patients" component={PatientSearchScreen} />
      <HealthcareTabs.Screen name="VRLibrary" component={VrLibraryScreen} options={{ title: 'VR Education' }} />
      <HealthcareTabs.Screen name="Notifications" component={NotificationsScreen} />
      <HealthcareTabs.Screen name="Profile" component={ProfileScreen} />
    </HealthcareTabs.Navigator>
  );
}

function AdminTabNavigator() {
  const { theme } = useTheme();
  return (
    <AdminTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof AdminTabParamList, keyof typeof Ionicons.glyphMap> = {
            Dashboard: 'grid',
            Users: 'people',
            Facilities: 'business',
            Content: 'film',
            Profile: 'person-circle',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <AdminTabs.Screen name="Dashboard" component={AdminDashboard} />
      <AdminTabs.Screen name="Users" component={UserManagementScreen} />
      <AdminTabs.Screen name="Facilities" component={FacilityManagementScreen} />
      <AdminTabs.Screen name="Content" component={VrContentScreen} options={{ title: 'VR Content' }} />
      <AdminTabs.Screen name="Profile" component={ProfileScreen} />
    </AdminTabs.Navigator>
  );
}

export function RootNavigator() {
  const { theme } = useTheme();
  const { user, initializing } = useAuth();

  const navTheme = theme.dark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.colors.background, card: theme.colors.surface, primary: theme.colors.primary } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.background, card: theme.colors.surface, primary: theme.colors.primary } };

  if (initializing) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!user ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
      ) : (
        <MainStack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <MainStack.Screen name="Tabs" options={{ headerShown: false }}>
            {() => (user.role === 'admin' ? <AdminTabNavigator /> : <HealthcareTabNavigator />)}
          </MainStack.Screen>
          <MainStack.Screen name="PatientRegistration" component={PatientRegistrationScreen} options={{ title: 'Register Patient' }} />
          <MainStack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ title: 'Patient Record' }} />
          <MainStack.Screen name="Consultation" component={ConsultationScreen} options={{ title: 'ANC Consultation' }} />
          <MainStack.Screen name="Assessment" component={AssessmentScreen} options={{ title: 'AI Assessment' }} />
          <MainStack.Screen name="VrPlayer" component={VrPlayerScreen} options={{ headerShown: false }} />
          <MainStack.Screen name="Referral" component={ReferralScreen} options={{ title: 'Referral' }} />
          <MainStack.Screen name="ConsultationSummary" component={ConsultationSummaryScreen} options={{ title: 'Summary' }} />
          <MainStack.Screen name="HighRiskList" component={HighRiskListScreen} options={{ title: 'High-Risk Patients' }} />
          <MainStack.Screen name="FollowUpList" component={FollowUpListScreen} options={{ title: 'Follow-ups' }} />
          <MainStack.Screen name="UserForm" component={UserFormScreen} options={{ title: 'New User' }} />
          <MainStack.Screen name="FacilityForm" component={FacilityFormScreen} options={{ title: 'New Facility' }} />
          <MainStack.Screen name="VrModuleForm" component={VrModuleFormScreen} options={{ title: 'New VR Module' }} />
          <MainStack.Screen name="AuditLogs" component={AuditLogsScreen} options={{ title: 'Audit Logs' }} />
          <MainStack.Screen name="Branding" component={BrandingScreen} options={{ title: 'Branding' }} />
          <MainStack.Screen name="Team" component={TeamScreen} options={{ title: 'Project Team' }} />
        </MainStack.Navigator>
      )}
    </NavigationContainer>
  );
}
