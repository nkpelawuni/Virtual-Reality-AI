import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, Text } from 'react-native';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, Field, Screen, ScreenTitle } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { createVrModule } from '@/services/vr';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme/theme';

export function VrModuleFormScreen() {
  const { theme } = useTheme();
  const { user: admin } = useAuth();
  const navigation = useNavigation();

  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [keyMessages, setKeyMessages] = useState('');
  const [duration, setDuration] = useState('5');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    if (!admin) return;
    if (!title.trim()) {
      setError('A module title is required.');
      return;
    }
    const messages = keyMessages
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (messages.length === 0) {
      setError('Add at least one key learning message (one per line).');
      return;
    }
    const module = createVrModule(admin, {
      title,
      purpose,
      keyMessages: messages,
      durationMinutes: Number(duration) || 5,
      videoUri,
      thumbnailUri,
    });
    Alert.alert('Module Published', `"${module.title}" is now available in the VR education library.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <Screen>
      <ScreenTitle subtitle="Educational content should be reviewed by clinical experts before publication (§7.11).">
        Publish VR Module
      </ScreenTitle>
      <Card>
        <Field label="Module Title *" value={title} onChangeText={setTitle} placeholder="e.g. Breastfeeding Basics" />
        <Field label="Purpose" value={purpose} onChangeText={setPurpose} multiline placeholder="What this lesson teaches and why it matters." />
        <Field
          label="Key Learning Messages * (one per line)"
          value={keyMessages}
          onChangeText={setKeyMessages}
          multiline
          placeholder={'Attend all antenatal appointments.\nReport severe headaches immediately.'}
        />
        <Field label="Estimated Duration (minutes)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        <MediaPicker
          label="Lesson Video"
          kind="video"
          ownerType="vr_video"
          value={videoUri}
          onChange={setVideoUri}
          helper="MP4 recommended. Without a video the lesson plays as guided narration."
        />
        <MediaPicker
          label="Thumbnail Image"
          kind="image"
          ownerType="vr_thumbnail"
          value={thumbnailUri}
          onChange={setThumbnailUri}
        />
        {error ? (
          <Text style={{ color: theme.colors.danger, fontSize: typography.caption, marginBottom: 8 }}>{error}</Text>
        ) : null}
        <Button title="Publish Module" icon="cloud-upload-outline" onPress={handleCreate} />
        <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </Screen>
  );
}
