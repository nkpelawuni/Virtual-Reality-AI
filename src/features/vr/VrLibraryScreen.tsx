import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Screen, ScreenTitle } from '@/components/ui';
import { listVrModules } from '@/services/vr';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import { VrModule } from '@/types';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function VrLibraryScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const [modules, setModules] = useState<VrModule[]>([]);

  useFocusEffect(
    useCallback(() => {
      setModules(listVrModules());
    }, [])
  );

  return (
    <Screen>
      <ScreenTitle subtitle="Immersive lessons that reinforce your counselling. Choose a module to begin.">
        VR Education Library
      </ScreenTitle>

      {modules.length === 0 ? (
        <EmptyState
          icon="glasses-outline"
          title="No Modules Available"
          message="Ask your administrator to publish VR education content."
        />
      ) : (
        modules.map((module) => (
          <Card
            key={module.id}
            onPress={() => navigation.navigate('VrPlayer', { moduleId: module.id, language: 'en' })}
          >
            <View style={styles.row}>
              {module.thumbnailUri ? (
                <Image source={{ uri: module.thumbnailUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <Ionicons name="glasses" size={28} color={theme.colors.primary} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ fontSize: typography.cardTitle, fontWeight: '600', color: theme.colors.text }}>
                  {module.title}
                </Text>
                <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }} numberOfLines={2}>
                  {module.purpose}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 }}>
                    ~{module.durationMinutes} min
                  </Text>
                  <Ionicons
                    name={module.videoUri ? 'videocam' : 'videocam-off-outline'}
                    size={14}
                    color={module.videoUri ? theme.colors.success : theme.colors.warning}
                    style={{ marginLeft: spacing.sm }}
                  />
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 }}>
                    {module.videoUri ? 'Video ready' : 'Guided narration'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </View>
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
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
