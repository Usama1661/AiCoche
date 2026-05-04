import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

export default function NotFoundScreen() {
  const { colors } = useAppTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  link: {
    marginTop: spacing.lg,
  },
});
