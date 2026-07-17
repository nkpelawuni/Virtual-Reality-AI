import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashScreen } from '@/features/authentication/SplashScreen';
import { AuthProvider } from '@/hooks/useAuth';
import { RootNavigator } from '@/navigation/RootNavigator';
import { initDatabase } from '@/services/database';
import { seedIfNeeded } from '@/services/seed';
import { ThemeProvider } from '@/theme/ThemeContext';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      initDatabase();
      await seedIfNeeded();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
