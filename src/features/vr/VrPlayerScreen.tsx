/**
 * VR Player (§4.9 / §8.13): plays the module's uploaded lesson video in an
 * immersive full-screen experience suitable for smartphone VR headsets.
 * When no video has been uploaded yet, the player falls back to a guided
 * narration mode that steps through the module's key learning messages, so
 * education can still be delivered before content production is complete.
 */
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { getVrModule, startVrSession, updateVrSession } from '@/services/vr';
import { spacing, typography } from '@/theme/theme';
import { VR_LANGUAGE_LABELS, VrLanguage } from '@/types';
import { MainStackParamList } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'VrPlayer'>;

const NARRATION_STEP_MS = 8000;

export function VrPlayerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const module = getVrModule(route.params.moduleId);

  const [language, setLanguage] = useState<VrLanguage>(route.params.language);
  const [subtitles, setSubtitles] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [narrationIndex, setNarrationIndex] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (user && module) {
      const session = startVrSession(
        user,
        module.id,
        route.params.patientId ?? null,
        route.params.visitId ?? null,
        language
      );
      sessionIdRef.current = session.id;
    }
    // Session is created once on entry; language changes are tracked in-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guided narration mode: advance through key messages on a timer.
  useEffect(() => {
    if (!module || module.videoUri || !playing) return;
    const total = module.keyMessages.length;
    const timer = setInterval(() => {
      setNarrationIndex((index) => {
        const next = index + 1;
        const pct = Math.min(Math.round((next / total) * 100), 100);
        setProgress(pct);
        if (sessionIdRef.current) updateVrSession(sessionIdRef.current, pct, pct >= 100);
        if (next >= total) {
          setPlaying(false);
          return index;
        }
        return next;
      });
    }, NARRATION_STEP_MS);
    return () => clearInterval(timer);
  }, [module, playing]);

  if (!module) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.subtitleText}>Module not found.</Text>
      </SafeAreaView>
    );
  }

  const exit = () => {
    if (sessionIdRef.current) {
      updateVrSession(sessionIdRef.current, progress, progress >= 100);
    }
    navigation.goBack();
  };

  const replay = async () => {
    setNarrationIndex(0);
    setProgress(0);
    setPlaying(true);
    if (module.videoUri && videoRef.current) {
      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
    }
  };

  const togglePlay = async () => {
    const next = !playing;
    setPlaying(next);
    if (module.videoUri && videoRef.current) {
      if (next) await videoRef.current.playAsync();
      else await videoRef.current.pauseAsync();
    }
  };

  const cycleLanguage = () => {
    const languages = module.languages.length > 0 ? module.languages : (['en'] as VrLanguage[]);
    const currentIndex = languages.indexOf(language);
    setLanguage(languages[(currentIndex + 1) % languages.length]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar: title, language, exit (§8.13) */}
      <View style={styles.topBar}>
        <Text style={styles.title} numberOfLines={1}>
          {module.title}
        </Text>
        <Pressable onPress={cycleLanguage} style={styles.topAction}>
          <Ionicons name="language" size={20} color="#fff" />
          <Text style={styles.topActionText}>{VR_LANGUAGE_LABELS[language]}</Text>
        </Pressable>
        <Pressable onPress={exit} style={styles.topAction}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Immersive scene */}
      <View style={styles.scene}>
        {module.videoUri ? (
          <Video
            ref={videoRef}
            source={{ uri: module.videoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={playing}
            isLooping={false}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded || !status.durationMillis) return;
              const pct = Math.round((status.positionMillis / status.durationMillis) * 100);
              setProgress(pct);
              if (sessionIdRef.current) {
                updateVrSession(sessionIdRef.current, pct, status.didJustFinish === true || pct >= 99);
              }
              if (status.didJustFinish) setPlaying(false);
            }}
          />
        ) : (
          <View style={styles.narration}>
            <Ionicons name="glasses-outline" size={64} color="#5B9BE6" />
            <Text style={styles.narrationStep}>
              Lesson {Math.min(narrationIndex + 1, module.keyMessages.length)} of {module.keyMessages.length}
            </Text>
            <Text style={styles.narrationText}>{module.keyMessages[narrationIndex]}</Text>
            <Text style={styles.narrationHint}>
              Guided narration mode — your administrator can upload the full VR video for this lesson.
            </Text>
          </View>
        )}

        {subtitles && module.videoUri ? (
          <View style={styles.subtitleBox}>
            <Text style={styles.subtitleText}>{module.keyMessages[0]}</Text>
          </View>
        ) : null}
      </View>

      {/* Progress indicator */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{progress}% complete</Text>

      {/* Bottom controls: play/pause, replay, subtitles (§8.13) */}
      <View style={styles.controls}>
        <Pressable onPress={togglePlay} style={styles.controlButton}>
          <Ionicons name={playing ? 'pause' : 'play'} size={28} color="#fff" />
          <Text style={styles.controlLabel}>{playing ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable onPress={replay} style={styles.controlButton}>
          <Ionicons name="refresh" size={28} color="#fff" />
          <Text style={styles.controlLabel}>Replay</Text>
        </Pressable>
        <Pressable onPress={() => setSubtitles((s) => !s)} style={styles.controlButton}>
          <Ionicons name={subtitles ? 'text' : 'text-outline'} size={28} color={subtitles ? '#5B9BE6' : '#fff'} />
          <Text style={styles.controlLabel}>Subtitles</Text>
        </Pressable>
        <Pressable onPress={exit} style={styles.controlButton}>
          <Ionicons name="exit-outline" size={28} color="#fff" />
          <Text style={styles.controlLabel}>Exit</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F14',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: typography.cardTitle,
    fontWeight: '700',
  },
  topAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topActionText: {
    color: '#fff',
    fontSize: 13,
  },
  scene: {
    flex: 1,
    margin: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111A24',
    justifyContent: 'center',
  },
  narration: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  narrationStep: {
    color: '#5B9BE6',
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  narrationText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 32,
  },
  narrationHint: {
    color: '#94A3B1',
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitleBox: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: spacing.sm,
  },
  subtitleText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1B2836',
    borderRadius: 3,
    marginHorizontal: spacing.md,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#5B9BE6',
    borderRadius: 3,
  },
  progressLabel: {
    color: '#94A3B1',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlLabel: {
    color: '#94A3B1',
    fontSize: 12,
    marginTop: 4,
  },
});
