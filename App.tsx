import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashScreen } from '@/features/authentication/SplashScreen';
import { AuthProvider } from '@/hooks/useAuth';
import { RootNavigator } from '@/navigation/RootNavigator';
import { initDatabase } from '@/services/database';
import { seedIfNeeded } from '@/services/seed';
import { ThemeProvider } from '@/theme/ThemeContext';

// Create the schema synchronously at module load, before anything renders,
// so no screen can ever query a table that does not exist yet.
initDatabase();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
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
