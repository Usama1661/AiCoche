import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { parseProfessionalProfileFromResume } from '@/src/lib/resumeProfileParser';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

/** Placeholder until backend extracts PDF text */
const PLACEHOLDER_CV_TEXT = `Experienced professional with a track record of shipping outcomes.
Skills: communication, collaboration, problem solving.
This text would be replaced by your Supabase pipeline after upload.`;

export default function CvUploadScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const setLastCv = useMetricsStore((s) => s.setLastCv);
  const setLastCvText = useMetricsStore((s) => s.setLastCvText);
  const lastCvFileName = useMetricsStore((s) => s.lastCvFileName);
  const lastCvUri = useMetricsStore((s) => s.lastCvUri);
  const displayName = useSessionStore((s) => s.displayName);
  const professionLabel = useProfileStore((s) => s.professionLabel);
  const replaceProfessionalProfile = useProfileStore((s) => s.replaceProfessionalProfile);

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const file = res.assets[0];
    if (!file?.name) return;
    setLastCv(file.name, file.uri ?? null);
    setLastCvText(PLACEHOLDER_CV_TEXT);
    replaceProfessionalProfile(
      parseProfessionalProfileFromResume({
        resumeText: PLACEHOLDER_CV_TEXT,
        fileName: file.name,
        displayName,
        fallbackHeadline: professionLabel,
      })
    );
  }

  function analyze() {
    if (!lastCvFileName) {
      Alert.alert('No file', 'Choose a PDF first.');
      return;
    }
    router.push('/cv-analysis');
  }

  return (
    <Screen scroll>
      <AppHeader title="Upload CV" onBack={() => router.back()} />
      <AppText variant="body" muted style={{ marginBottom: spacing.lg }}>
        Select a PDF. Your backend will extract text and store it in `cv_data`.
      </AppText>

      <Pressable
        onPress={pick}
        style={[
          styles.drop,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}>
        <Ionicons name="document-text-outline" size={40} color={colors.primary} />
        <AppText variant="subtitle" style={{ marginTop: spacing.md }}>
          Tap to choose PDF
        </AppText>
        <AppText variant="caption" muted style={{ marginTop: spacing.xs }}>
          Drag & drop style — mobile friendly tap area
        </AppText>
      </Pressable>

      {lastCvFileName ? (
        <View
          style={[
            styles.fileRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}>
          <Ionicons name="attach-outline" size={20} color={colors.textMuted} />
          <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
            {lastCvFileName}
          </AppText>
          <Button title="Replace" variant="ghost" onPress={pick} />
        </View>
      ) : null}

      <Button title="Analyze CV" onPress={analyze} disabled={!lastCvFileName} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  drop: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
});
