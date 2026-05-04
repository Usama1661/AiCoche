import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Badge } from '@/src/components/ui/Badge';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  role: 'assistant' | 'user';
  text: string;
  score?: number;
};

export function MessageBubble({ role, text, score }: Props) {
  const { colors } = useAppTheme();
  const isUser = role === 'user';
  return (
    <View style={[styles.wrap, isUser ? styles.right : styles.left]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.userBubble : colors.aiBubble,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
          },
        ]}>
        <AppText variant="body">{text}</AppText>
        {!isUser && score != null ? (
          <View style={{ marginTop: spacing.sm }}>
            <Badge label={`Score ${score}/10`} tone="primary" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, width: '100%' },
  left: { alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    padding: spacing.md,
    borderRadius: radii.lg,
  },
});
