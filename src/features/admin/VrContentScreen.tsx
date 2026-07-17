/**
 * VR Content Manager: administrators upload and maintain the video and
 * thumbnail media for every VR education module (§7 / §9.9). Uploaded files
 * are stored in private app storage and queued for cloud replication by the
 * Sync Manager, so modules keep working fully offline (§7.10).
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, Screen, ScreenTitle } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { listVrModules, setModuleThumbnail, setModuleVideo } from '@/services/vr';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import { VrModule } from '@/types';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function VrContentScreen() {
  const { theme } = useTheme();
  const { user: admin } = useAuth();
  const navigation = useNavigation<Nav>();
  const [modules, setModules] = useState<VrModule[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(() => setModules(listVrModules()), []);
  useFocusEffect(refresh);

  return (
    <Screen>
      <ScreenTitle subtitle="Upload lesson videos and thumbnails for each education module. Content plays fully offline once uploaded.">
        VR Content Manager
      </ScreenTitle>
      <Button title="Publish New Module" icon="add-circle-outline" onPress={() => navigation.navigate('VrModuleForm', {})} />

      {modules.map((module) => {
        const expanded = expandedId === module.id;
        return (
          <Card key={module.id}>
            <View style={styles.row}>
              {module.thumbnailUri ? (
                <Image source={{ uri: module.thumbnailUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
                  <Ionicons name="glasses" size={22} color={theme.colors.primary} />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ fontSize: typography.body, fontWeight: '600', color: theme.colors.text }}>
                  {module.title}
                </Text>
                <View style={styles.statusRow}>
                  <Ionicons
                    name={module.videoUri ? 'checkmark-circle' : 'alert-circle-outline'}
                    size={14}
                    color={module.videoUri ? theme.colors.success : theme.colors.warning}
                  />
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginLeft: 4 }}>
                    {module.videoUri ? 'Video uploaded' : 'No video — plays as guided narration'}
                    {module.isBuiltin ? ' · Built-in module' : ''}
                  </Text>
                </View>
              </View>
            </View>

            {expanded ? (
              <View style={{ marginTop: spacing.md }}>
                <MediaPicker
                  label="Lesson Video"
                  kind="video"
                  ownerType="vr_video"
                  ownerId={module.id}
                  value={module.videoUri}
                  onChange={(uri) => {
                    if (admin) setModuleVideo(admin, module.id, uri);
                    refresh();
                  }}
                  helper="MP4 recommended, 3–7 minutes, optimized for mid-range Android devices."
                />
                <MediaPicker
                  label="Thumbnail Image"
                  kind="image"
                  ownerType="vr_thumbnail"
                  ownerId={module.id}
                  value={module.thumbnailUri}
                  onChange={(uri) => {
                    if (admin) setModuleThumbnail(admin, module.id, uri);
                    refresh();
                  }}
                  helper="Shown in the VR education library."
                />
                <Button title="Done" variant="secondary" onPress={() => setExpandedId(null)} />
              </View>
            ) : (
              <Button
                title="Manage Media"
                variant="secondary"
                icon="cloud-upload-outline"
                onPress={() => setExpandedId(module.id)}
              />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
});
