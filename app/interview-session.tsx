import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { ChatInput } from '@/src/components/chat/ChatInput';
import { TypingIndicator } from '@/src/components/chat/TypingIndicator';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { UpgradeSheet } from '@/src/components/subscription/UpgradeSheet';
import {
  continueInterview,
  getInterviewSession,
  saveInterviewSessionScore,
  startInterview,
} from '@/src/lib/api/interview';
import { buildUserProfileFromStores } from '@/src/lib/buildUserProfile';
import type { InterviewMessage } from '@/src/types/interview';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useUsageStore } from '@/src/store/usageStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function InterviewSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string; mode?: string }>();
  const { colors } = useAppTheme();
  const setLastInterviewScore = useMetricsStore((s) => s.setLastInterviewScore);
  const canStartChat = useUsageStore((s) => s.canStartChat());
  const incrementChat = useUsageStore((s) => s.incrementChat);
  const plan = useUsageStore((s) => s.plan);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitingAnswer, setWaitingAnswer] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<'active' | 'completed' | 'abandoned' | null>(null);
  const listRef = useRef<FlatList>(null);
  const interviewSessionCreditRef = useRef(false);
  const historySessionId = typeof params.sessionId === 'string' ? params.sessionId : null;
  const isHistoryMode = params.mode === 'history' && !!historySessionId;
  const canContinueHistory = isHistoryMode && plan === 'pro' && historyStatus === 'active';

  const boot = useCallback(async () => {
    if (isHistoryMode && historySessionId) {
      setLoadingStart(true);
      setError(null);
      try {
        const session = await getInterviewSession(historySessionId);
        const lastMessage = session.messages.at(-1);
        setSessionId(session.id);
        setMessages(session.messages);
        setHistoryStatus(session.status);
        setWaitingAnswer(
          plan === 'pro' &&
            session.status === 'active' &&
            lastMessage?.role === 'assistant'
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load interview history');
      } finally {
        setLoadingStart(false);
      }
      return;
    }

    if (!canStartChat) {
      setUpgradeOpen(true);
      return;
    }
    setLoadingStart(true);
    setError(null);
    try {
      const profile = buildUserProfileFromStores();
      const m = useMetricsStore.getState();
      const res = await startInterview(profile, {
        lastCvScore: m.lastCvScore,
        lastInterviewScore: m.lastInterviewScore,
        lastQuizScore: m.lastQuizScore,
        lastQuizLevel: m.lastQuizLevel,
        lastAnalysis: m.lastAnalysis,
      });
      if (!interviewSessionCreditRef.current) {
        interviewSessionCreditRef.current = true;
        incrementChat();
      }
      setSessionId(res.sessionId);
      setMessages([
        {
          id: id(),
          role: 'assistant',
          content: res.question,
        },
      ]);
      setWaitingAnswer(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start interview');
    } finally {
      setLoadingStart(false);
    }
  }, [canStartChat, historySessionId, incrementChat, isHistoryMode, plan]);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    boot();
  }, [boot]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionId || !waitingAnswer) return;
    setInput('');
    setWaitingAnswer(false);
    setError(null);

    setMessages((m) => [...m, { id: id(), role: 'user', content: text }]);
    setTyping(true);

    try {
      const profile = buildUserProfileFromStores();
      const res = await continueInterview({
        sessionId,
        answer: text,
        professionLabel: profile.professionLabel ?? '',
      });
      setTyping(false);
      setLastInterviewScore(res.score);
      saveInterviewSessionScore({
        sessionId,
        title: profile.professionLabel
          ? `${profile.professionLabel} interview`
          : 'Interview practice',
        score: res.score,
        status: res.finished ? 'completed' : 'active',
        feedback: res.feedback,
      }).catch(() => {});

      setMessages((prev) => {
        const feedbackMsg: InterviewMessage = {
          id: id(),
          role: 'assistant',
          content: res.feedback,
          score: res.score,
        };
        const out = [...prev, feedbackMsg];
        if (res.nextQuestion) {
          out.push({
            id: id(),
            role: 'assistant',
            content: res.nextQuestion,
          });
          setWaitingAnswer(true);
        } else {
          out.push({
            id: id(),
            role: 'assistant',
            content: 'That completes this mock interview. Great work!',
          });
          setWaitingAnswer(false);
        }
        return out;
      });
    } catch (e) {
      setTyping(false);
      setWaitingAnswer(true);
      setError(e instanceof Error ? e.message : 'Request failed');
    }
  }, [input, sessionId, waitingAnswer, setLastInterviewScore]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <AppHeader title={isHistoryMode ? 'Interview history' : 'Mock interview'} onBack={() => router.back()} />
        {error ? (
          <View style={{ marginBottom: spacing.sm }}>
            <ErrorBanner message={error} />
            {messages.length === 0 ? (
              <Button title="Try again" onPress={boot} loading={loadingStart} style={{ marginTop: spacing.sm }} />
            ) : null}
          </View>
        ) : null}
        {isHistoryMode ? (
          <AppText variant="caption" muted style={{ marginBottom: spacing.sm }}>
            {canContinueHistory
              ? 'Pro mode: continue this saved interview chat.'
              : plan === 'pro' && historyStatus === 'completed'
                ? 'This interview is completed, so the transcript is read-only.'
                : 'Free users can view past transcripts. Upgrade to Pro to continue saved chats.'}
          </AppText>
        ) : plan === 'free' ? (
          <AppText variant="caption" muted style={{ marginBottom: spacing.sm }}>
            Free: 3 mock interview sessions; each has 6 questions. Replies do not use extra sessions.
          </AppText>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            loadingStart ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
                <ActivityIndicator color={colors.primary} />
                <TypingIndicator />
              </View>
            ) : null
          }
          ListFooterComponent={
            typing ? (
              <View style={{ paddingVertical: spacing.sm }}>
                <TypingIndicator />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <MessageBubble
              role={item.role === 'user' ? 'user' : 'assistant'}
              text={item.content}
              score={item.score}
            />
          )}
        />

        {isHistoryMode && !canContinueHistory ? (
          <View style={[styles.inputWrap, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Button
              title={plan === 'free' ? 'Upgrade to continue chats' : 'Back to interviews'}
              variant={plan === 'free' ? 'primary' : 'ghost'}
              onPress={plan === 'free' ? () => setUpgradeOpen(true) : () => router.back()}
            />
            {plan === 'free' ? (
              <Button
                title="Back to interviews"
                variant="ghost"
                onPress={() => router.back()}
                style={{ marginTop: spacing.sm }}
              />
            ) : null}
          </View>
        ) : (
          <View style={[styles.inputWrap, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <ChatInput
              value={input}
              onChangeText={setInput}
              onSend={send}
              disabled={!waitingAnswer || typing || loadingStart}
            />
            <Button
              title="End session"
              variant="ghost"
              onPress={() => router.back()}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      <UpgradeSheet visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  inputWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
