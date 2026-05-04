import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';
import { ProgressHeader } from '@/src/components/layout/ProgressHeader';
import { spacing } from '@/src/theme/tokens';

type Props = {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function StepShell({ step, total, title, subtitle, children }: Props) {
  return (
    <Screen scroll keyboard>
      <ProgressHeader step={step} total={total} />
      <View style={styles.header}>
        <AppText variant="display" style={{ marginBottom: spacing.sm }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.xl },
});
