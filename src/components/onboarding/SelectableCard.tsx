import { StyleSheet } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { HapticPressable as Pressable } from '@/src/components/ui/HapticPressable';
import { Card } from '@/src/components/ui/Card';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

type Props = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectableCard({ title, description, selected, onPress }: Props) {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
      <Card
        style={StyleSheet.compose(styles.card, {
          borderColor: selected ? colors.primary : undefined,
          borderWidth: selected ? 2 : 1,
        })}
      >
        <AppText variant="subtitle">{title}</AppText>
        {description ? (
          <AppText variant="caption" muted style={{ marginTop: spacing.xs }}>
            {description}
          </AppText>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
});
