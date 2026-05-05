import { Platform, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({
  value,
  onChangeText,
  onSend,
  disabled,
  placeholder = 'Type your answer...',
}: Props) {
  const { colors } = useAppTheme();
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        multiline
        editable={!disabled}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.send,
          { backgroundColor: canSend ? colors.primary : colors.border, opacity: pressed ? 0.9 : 1 },
        ]}
        accessibilityLabel="Send message"
        accessibilityRole="button">
        <Ionicons name="send" size={20} color={colors.textInverse} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    fontSize: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: 2,
  },
});
