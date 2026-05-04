import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type Props = { message: string };

export function ErrorBanner({ message }: Props) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: colors.error },
      ]}>
      <Ionicons name="warning-outline" size={18} color={colors.error} />
      <AppText variant="caption" style={{ color: colors.error, flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
});
