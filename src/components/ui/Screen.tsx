import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  keyboard?: boolean;
};

export function Screen({
  children,
  scroll,
  contentContainerStyle,
  edges = ['top', 'left', 'right'],
  keyboard,
}: Props) {
  const { colors } = useAppTheme();
  const inner = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.scrollContent,
        { backgroundColor: colors.background },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {children}
    </View>
  );

  const wrapped =
    keyboard && Platform.OS === 'ios' ? (
      <KeyboardAvoidingView
        style={styles.fill}
        behavior="padding"
        keyboardVerticalOffset={0}>
        {inner}
      </KeyboardAvoidingView>
    ) : (
      inner
    );

  return (
    <SafeAreaView
      style={[styles.fill, { backgroundColor: colors.background }]}
      edges={edges}>
      {wrapped}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
});
