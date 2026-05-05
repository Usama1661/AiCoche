import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { uploadCv } from '@/src/lib/api/cv';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

export default function CvUploadScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const setLastCv = useMetricsStore((s) => s.setLastCv);
  const setLastCvText = useMetricsStore((s) => s.setLastCvText);
  const lastCvDocumentId = useMetricsStore((s) => s.lastCvDocumentId);
  const lastCvStatus = useMetricsStore((s) => s.lastCvStatus);
  const lastCvFileName = useMetricsStore((s) => s.lastCvFileName);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const file = res.assets[0];
    if (!file?.name || !file.uri) return;

    try {
      setUploading(true);
      setError(null);
      const data = await uploadCv({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || 'application/pdf',
        size: file.size,
      });
      const extractedText = data.extractedText.trim();
      setLastCv(
        data.cvDocument.file_name,
        file.uri,
        data.cvDocument.id,
        data.cvDocument.status
      );
      setLastCvText(extractedText);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not upload CV.';
      setError(message);
      Alert.alert('Upload failed', message);
    } finally {
      setUploading(false);
    }
  }

  function analyze() {
    if (!lastCvDocumentId) {
      Alert.alert('No file', 'Choose a PDF first.');
      return;
    }
    router.push('/cv-analysis');
  }

  return (
    <Screen scroll>
      <AppHeader title="Upload CV" onBack={() => router.back()} />
      <AppText variant="body" muted style={{ marginBottom: spacing.lg }}>
        Select a PDF, DOC, or DOCX. The file will be stored in Supabase and linked to your account.
      </AppText>
      {error ? <ErrorBanner message={error} /> : null}

      <Pressable
        onPress={pick}
        disabled={uploading}
        style={[
          styles.drop,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: uploading ? 0.7 : 1,
          },
        ]}>
        <Ionicons name="document-text-outline" size={40} color={colors.primary} />
        <AppText variant="subtitle" style={{ marginTop: spacing.md }}>
          {uploading ? 'Uploading CV...' : 'Tap to choose CV'}
        </AppText>
        <AppText variant="caption" muted style={{ marginTop: spacing.xs }}>
          Supported formats: PDF, DOC, DOCX
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
          <Button title="Replace" variant="ghost" onPress={pick} disabled={uploading} />
        </View>
      ) : null}

      {lastCvDocumentId ? (
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontWeight: '900' }}>
              CV saved to Supabase
            </AppText>
            <AppText variant="caption" muted>
              Status: {lastCvStatus || 'uploaded'}
            </AppText>
          </View>
        </View>
      ) : null}

      <Button title="Analyze CV" onPress={analyze} disabled={!lastCvDocumentId || uploading} />
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
});
