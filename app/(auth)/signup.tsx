import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { FormInput } from '@/src/components/ui/FormInput';
import { Screen } from '@/src/components/ui/Screen';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useSessionStore } from '@/src/store/sessionStore';
import { spacing } from '@/src/theme/tokens';

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export default function SignupScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [emailErr, setEmailErr] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [loading, setLoading] = useState(false);
  const signup = useSessionStore((s) => s.signup);

  const canSubmit = useMemo(() => {
    return isValidEmail(email) && password.length >= 6;
  }, [email, password]);

  async function onSubmit() {
    setEmailErr('');
    setPwErr('');
    if (!isValidEmail(email)) {
      setEmailErr('Enter a valid email');
      return;
    }
    if (password.length < 6) {
      setPwErr('At least 6 characters');
      return;
    }
    try {
      setLoading(true);
      const result = await signup(email.trim(), password, name.trim() || undefined);
      if (result.needsEmailConfirmation) {
        Alert.alert(
          'Check your email',
          'Your account was created. Confirm your email, then sign in.'
        );
        router.replace('/(auth)/login');
        return;
      }
      router.replace('/');
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll keyboard contentContainerStyle={styles.container}>
      <View style={[styles.logo, { backgroundColor: 'rgba(79,70,229,0.16)' }]}>
        <Ionicons name="briefcase-outline" size={44} color={colors.primary} />
      </View>
      <AppText variant="display" style={styles.title}>
        Create Account
      </AppText>
      <AppText variant="body" muted style={styles.subtitle}>
        Start your career growth journey today
      </AppText>

      <FormInput
        label="Full Name"
        placeholder="John Doe"
        value={name}
        onChangeText={setName}
        leftIcon={<Ionicons name="person-outline" size={23} color={colors.textMuted} />}
      />
      <FormInput
        label="Email"
        placeholder="you@example.com"
        leftIcon={<Ionicons name="mail-outline" size={23} color={colors.textMuted} />}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        error={emailErr}
        containerStyle={{ marginTop: spacing.md }}
      />
      <FormInput
        label="Password"
        placeholder="Min. 6 characters"
        leftIcon={<Ionicons name="lock-closed-outline" size={23} color={colors.textMuted} />}
        rightIcon={<Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={23} color={colors.textMuted} />}
        onRightIconPress={() => setSecure((v) => !v)}
        secureTextEntry={secure}
        value={password}
        onChangeText={setPassword}
        error={pwErr}
        containerStyle={{ marginTop: spacing.md }}
      />

      <Button
        title="Create account"
        onPress={onSubmit}
        disabled={!canSubmit || loading}
        loading={loading}
        style={styles.mainButton}
        leftIcon={<Ionicons name="arrow-forward-outline" size={22} color="#FFFFFF" />}
      />

      <View style={styles.orRow}>
        <View style={[styles.orLine, { backgroundColor: colors.border }]} />
        <AppText variant="body" muted style={{ fontWeight: '900' }}>
          or
        </AppText>
        <View style={[styles.orLine, { backgroundColor: colors.border }]} />
      </View>

      <Pressable
        style={[styles.google, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() => Alert.alert('Google sign-up', 'Coming soon')}>
        <View style={styles.googleDot}>
          <AppText variant="caption" style={{ color: '#FFFFFF', fontWeight: '900' }}>
            G
          </AppText>
        </View>
        <AppText variant="subtitle">Sign up with Google</AppText>
      </Pressable>

      <AppText variant="body" muted style={styles.footerText}>
        Already have an account?{' '}
        <AppText
          variant="body"
          style={{ color: colors.primary, fontWeight: '900' }}
          onPress={() => router.push('/(auth)/login')}>
          Sign In
        </AppText>
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingTop: spacing.xxxl,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 24,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: { textAlign: 'center', marginBottom: spacing.sm },
  subtitle: {
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: spacing.xxxl,
  },
  mainButton: { marginTop: spacing.xxxl, minHeight: 66 },
  orRow: {
    marginVertical: spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  orLine: { height: 1, flex: 1 },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    minHeight: 66,
    borderRadius: 16,
    borderWidth: 1,
  },
  googleDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    textAlign: 'center',
    marginTop: spacing.xxxl,
    fontWeight: '800',
  },
});
