import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import {
  ASSISTANT_TTS_VOICE_OPTIONS,
  assistantVoicePreviewText,
  type AssistantTtsVoiceId,
} from '@/src/lib/assistantTtsVoice';
import { triggerLightHaptic } from '@/src/lib/haptics';
import { hasSupabaseConfig, supabase } from '@/src/lib/supabase';
import { useAssistantVoiceStore } from '@/src/store/assistantVoiceStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AssistantVoicePickerModal({ visible, onClose }: Props) {
  const { colors } = useAppTheme();
  const voiceId = useAssistantVoiceStore((s) => s.voiceId);
  const setVoiceId = useAssistantVoiceStore((s) => s.setVoiceId);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewingId, setPreviewingId] = useState<AssistantTtsVoiceId | null>(null);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const playSample = useCallback(async (id: AssistantTtsVoiceId) => {
    if (!hasSupabaseConfig()) {
      Alert.alert('Preview', 'Add Supabase URL and anon key to use voice samples.');
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Preview', 'Sign in to hear a short sample.');
      return;
    }

    setPreviewBusy(true);
    setPreviewingId(id);
    try {
      await soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;

      const { data, error } = await supabase.functions.invoke<{ audioBase64?: string }>('interview-tts', {
        body: { text: assistantVoicePreviewText(id), voice: id },
      });
      if (error || !data?.audioBase64) {
        const msg =
          error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Could not load this sample.';
        throw new Error(msg);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const uri = `data:audio/mpeg;base64,${data.audioBase64}`;
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;

      const finished = new Promise<void>((resolve, reject) => {
        sound.setOnPlaybackStatusUpdate((s) => {
          if (!s.isLoaded) return;
          if ('error' in s && s.error) {
            reject(new Error(String(s.error)));
            return;
          }
          if (s.didJustFinish) resolve();
        });
      });

      await sound.playAsync();
      await finished;
      await sound.unloadAsync();
      soundRef.current = null;
    } catch (e) {
      Alert.alert('Preview', e instanceof Error ? e.message : 'Playback failed.');
    } finally {
      setPreviewBusy(false);
      setPreviewingId(null);
    }
  }, []);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHeader}>
            <AppText variant="title" style={{ flex: 1, color: colors.text, textAlign: 'left' }}>
              Personal AI assistant voice
            </AppText>
            <Button title="Done" variant="ghost" onPress={onClose} />
          </View>
          <AppText variant="body" muted style={styles.hint}>
            Choose your practice assistant: tap Sample to preview, then tap their name to select.
          </AppText>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {ASSISTANT_TTS_VOICE_OPTIONS.map((opt, index) => {
              const selected = voiceId === opt.id;
              const playing = previewingId === opt.id;
              return (
                <View
                  key={opt.id}
                  style={[
                    styles.rowWrap,
                    {
                      borderBottomWidth: index < ASSISTANT_TTS_VOICE_OPTIONS.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.border,
                      borderLeftWidth: selected ? 4 : 0,
                      borderLeftColor: selected ? colors.primary : 'transparent',
                    },
                  ]}>
                  <Pressable
                    onPress={() => {
                      triggerLightHaptic();
                      setVoiceId(opt.id);
                    }}
                    style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.88 : 1 }]}>
                    <View style={styles.rowText}>
                      <AppText variant="body" style={{ fontWeight: '800', color: colors.text, textAlign: 'left' }}>
                        {opt.assistantName}
                      </AppText>
                      <AppText variant="caption" style={{ marginTop: 4, textAlign: 'left', fontWeight: '800', color: colors.primary }}>
                        {opt.gender} · {opt.toneType}
                      </AppText>
                    </View>
                  </Pressable>
                  <View style={styles.checkSlot}>
                    {selected ? <Ionicons name="checkmark-circle" size={24} color={colors.primary} /> : null}
                  </View>
                  <Button
                    title={playing ? 'Playing…' : 'Sample'}
                    variant="secondary"
                    disabled={previewBusy}
                    onPress={() => void playSample(opt.id)}
                    style={styles.sampleBtn}
                  />
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radii.xl,
    borderWidth: 1,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  hint: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    fontWeight: '700',
    textAlign: 'left',
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    minWidth: 0,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  checkSlot: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  sampleBtn: {
    flexShrink: 0,
    minWidth: 100,
    alignSelf: 'center',
  },
});
