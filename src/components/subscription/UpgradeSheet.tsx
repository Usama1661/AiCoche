import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';
import { useUsageStore } from '@/src/store/usageStore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function UpgradeSheet({ visible, onClose }: Props) {
  const { colors } = useAppTheme();
  const setPlan = useUsageStore((s) => s.setPlan);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}>
          <AppText variant="title" style={{ marginBottom: spacing.sm }}>
            AiCoche Pro
          </AppText>
          <AppText variant="body" muted style={{ marginBottom: spacing.lg }}>
            Unlimited mock interviews, unlimited CV analysis, and CV export when your backend is
            connected.
          </AppText>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="body">• Unlimited interview chat</AppText>
            <AppText variant="body">• Unlimited CV analysis</AppText>
            <AppText variant="body">• Download / export CV</AppText>
          </View>
          <Button
            title="Continue with Pro (demo)"
            onPress={() => {
              setPlan('pro');
              onClose();
            }}
            style={{ marginTop: spacing.xl }}
          />
          <Button title="Not now" variant="ghost" onPress={onClose} />
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
    padding: spacing.xl,
  },
});
