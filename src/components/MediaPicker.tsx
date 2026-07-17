/**
 * MediaPicker — the single, consistent upload control used everywhere media
 * can be attached in MamaVR AI:
 *
 *   • Patient photo (registration & patient card)      kind="image"
 *   • Facility logo (facility management)              kind="image"
 *   • Application logo (administrator branding)        kind="image"
 *   • Staff avatar (profile)                           kind="image"
 *   • VR lesson video (VR content manager)             kind="video"
 *   • VR lesson thumbnail (VR content manager)         kind="video" companion
 *
 * Images can come from the camera or the library; videos come from the
 * library. Files are persisted via the Media Manager service, which copies
 * them into private app storage and queues them for cloud upload.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { pickImage, pickVideo, takePhoto } from '@/services/media';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import { MediaKind, MediaOwnerType } from '@/types';

interface MediaPickerProps {
  label: string;
  kind: MediaKind;
  ownerType: MediaOwnerType;
  ownerId?: string | null;
  value: string | null;
  onChange: (uri: string | null) => void;
  /** Round preview for portraits/avatars; rectangular for logos and videos. */
  shape?: 'circle' | 'rect';
  /** Show the "Take Photo" action (images only). */
  allowCamera?: boolean;
  helper?: string;
}

export function MediaPicker({
  label,
  kind,
  ownerType,
  ownerId = null,
  value,
  onChange,
  shape = 'rect',
  allowCamera = false,
  helper,
}: MediaPickerProps) {
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  const handle = async (action: () => Promise<{ uri: string } | null>) => {
    setBusy(true);
    try {
      const asset = await action();
      if (asset) onChange(asset.uri);
    } catch {
      Alert.alert('Upload failed', 'The file could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const previewSize = shape === 'circle' ? 96 : undefined;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>

      {value ? (
        kind === 'image' ? (
          <Image
            source={{ uri: value }}
            style={[
              shape === 'circle'
                ? { width: previewSize, height: previewSize, borderRadius: (previewSize ?? 0) / 2 }
                : styles.rectPreview,
              { borderColor: theme.colors.border, borderWidth: 1, marginBottom: spacing.sm },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.videoPreview,
              { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="videocam" size={28} color={theme.colors.primary} />
            <Text
              numberOfLines={1}
              style={{ flex: 1, marginLeft: spacing.sm, color: theme.colors.text, fontSize: typography.caption }}
            >
              {value.split('/').pop()}
            </Text>
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
          </View>
        )
      ) : (
        <View
          style={[
            styles.placeholder,
            shape === 'circle' && { width: 96, height: 96, borderRadius: 48 },
            { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons
            name={kind === 'video' ? 'videocam-outline' : 'image-outline'}
            size={28}
            color={theme.colors.textSecondary}
          />
          {shape !== 'circle' ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
              No {kind} uploaded yet
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.actions}>
        {busy ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            <PickerAction
              icon={kind === 'video' ? 'film-outline' : 'images-outline'}
              label={kind === 'video' ? 'Upload Video' : 'Upload Image'}
              onPress={() =>
                handle(() =>
                  kind === 'video' ? pickVideo(ownerType, ownerId) : pickImage(ownerType, ownerId)
                )
              }
            />
            {kind === 'image' && allowCamera ? (
              <PickerAction
                icon="camera-outline"
                label="Take Photo"
                onPress={() => handle(() => takePhoto(ownerType, ownerId))}
              />
            ) : null}
            {value ? (
              <PickerAction icon="trash-outline" label="Remove" destructive onPress={() => onChange(null)} />
            ) : null}
          </>
        )}
      </View>
      {helper ? (
        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: spacing.xs }}>{helper}</Text>
      ) : null}
    </View>
  );
}

function PickerAction({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const { theme } = useTheme();
  const color = destructive ? theme.colors.danger : theme.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { borderColor: color, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color, fontSize: typography.caption, fontWeight: '600', marginLeft: 6 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  rectPreview: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
  },
  videoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  placeholder: {
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
