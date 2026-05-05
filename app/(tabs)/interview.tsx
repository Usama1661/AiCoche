import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText } from '@/src/components/ui/AppText';
import { HapticPressable as Pressable } from '@/src/components/ui/HapticPressable';
import { Screen } from '@/src/components/ui/Screen';
import { Button } from '@/src/components/ui/Button';
import {
  listInterviewSessions,
  type InterviewSessionSummary,
} from '@/src/lib/api/interview';
import {
  useInterviewReminderStore,
  type InterviewReminder,
} from '@/src/store/interviewReminderStore';
import { useSessionStore } from '@/src/store/sessionStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useUsageStore, FREE_CHAT_LIMIT } from '@/src/store/usageStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

export default function InterviewTabScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const userId = useSessionStore((s) => s.userId);
  const professionLabel = useProfileStore((s) => s.professionLabel);
  const chatsUsed = useUsageStore((s) => s.chatsUsed);
  const reminders = useInterviewReminderStore((s) => s.reminders);
  const scheduleReminder = useInterviewReminderStore((s) => s.scheduleReminder);
  const deleteReminder = useInterviewReminderStore((s) => s.deleteReminder);
  const progress = Math.min(1, chatsUsed / FREE_CHAT_LIMIT);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [pastSessions, setPastSessions] = useState<InterviewSessionSummary[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const upcomingReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.ownerUserId === userId)
        .filter((reminder) => new Date(reminder.scheduledAt).getTime() > now)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [now, reminders, userId]
  );
  const readyReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.ownerUserId === userId)
        .filter((reminder) => new Date(reminder.scheduledAt).getTime() <= now)
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [now, reminders, userId]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listInterviewSessions()
        .then((sessions) => {
          if (!cancelled) setPastSessions(sessions);
        })
        .catch(() => {
          if (!cancelled) setPastSessions([]);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function scheduleAt(scheduledAt: string) {
    try {
      setScheduling(true);
      await scheduleReminder({
        scheduledAt,
        title: `${professionLabel || 'Career'} mock interview practice`,
      });
      setScheduleOpen(false);
      setNow(Date.now());
    } catch (error) {
      Alert.alert(
        'Could not schedule reminder',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setScheduling(false);
    }
  }

  async function scheduleInMinutes(minutes: number) {
    await scheduleAt(new Date(Date.now() + minutes * 60 * 1000).toISOString());
  }

  async function onDeleteReminder(id: string) {
    try {
      await deleteReminder(id);
    } catch {
      Alert.alert('Could not delete reminder', 'Please try again.');
    }
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="display">Mock Interviews</AppText>
        <AppText variant="body" muted style={styles.sub}>
          Practice with AI and improve your skills
        </AppText>
      </View>

      <Pressable
        onPress={() => router.push('/interview-session')}
        style={({ pressed }) => [styles.hero, { opacity: pressed ? 0.9 : 1 }]}>
        <LinearGradient
          colors={colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.heroIcon, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="chatbubble-outline" size={38} color={colors.textInverse} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" style={[styles.heroTitle, { color: colors.textInverse }]}>
            Start New Interview
          </AppText>
          <AppText variant="body" style={[styles.heroText, { color: colors.textInverse }]} numberOfLines={1}>
            AI-powered {professionLabel || 'career'} interview
          </AppText>
        </View>
      </Pressable>

      <SchedulePracticeCard onSchedule={() => setScheduleOpen(true)} />

      {upcomingReminders.length > 0 ? (
        <>
          <AppText variant="title" style={styles.sectionTitle}>
            Scheduled Chats
          </AppText>
          {upcomingReminders.map((reminder) => (
            <ReminderConversationCard
              key={reminder.id}
              reminder={reminder}
              ready={false}
              onPress={() => Alert.alert('Interview scheduled', formatReminderTime(reminder.scheduledAt))}
              onDelete={() => onDeleteReminder(reminder.id)}
            />
          ))}
        </>
      ) : null}

      <View style={styles.usageRow}>
        <AppText variant="body" muted style={styles.usageText}>
          Interviews used this month
        </AppText>
        <AppText variant="body" style={styles.usageValue}>
          {chatsUsed} / {FREE_CHAT_LIMIT}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
      </View>

      <AppText variant="title" style={styles.sectionTitle}>
        Past Sessions
      </AppText>

      {readyReminders.map((reminder) => (
        <ReminderConversationCard
          key={reminder.id}
          reminder={reminder}
          ready
          onPress={() => router.push('/interview-session')}
          onDelete={() => onDeleteReminder(reminder.id)}
        />
      ))}

      {pastSessions.map((session) => (
        <PastSession
          key={session.id}
          title={session.title}
          score={session.score}
          status={session.status}
          updatedAt={session.updatedAt}
          onPress={() =>
            router.push({
              pathname: '/interview-session',
              params: { sessionId: session.id, mode: 'history' },
            })
          }
        />
      ))}

      {pastSessions.length === 0 && readyReminders.length === 0 ? (
        <EmptyState message="No interview sessions yet. Start your first interview to see progress here." />
      ) : null}
      <ScheduleReminderSheet
        visible={scheduleOpen}
        loading={scheduling}
        onClose={() => setScheduleOpen(false)}
        onSelect={scheduleInMinutes}
        onSelectAt={scheduleAt}
      />
    </Screen>
  );
}

function formatReminderTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Scheduled';
  return date.toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
}

function SchedulePracticeCard({ onSchedule }: { onSchedule: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.reminderIcon, { backgroundColor: colors.warningTint }]}>
        <Ionicons name="alarm-outline" size={24} color={colors.accentGold} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle">Schedule practice</AppText>
        <AppText variant="body" muted style={styles.reminderText}>
          Add a new interview card and get reminded when it is time.
        </AppText>
      </View>
      <View style={styles.reminderActions}>
        <Pressable onPress={onSchedule} hitSlop={8}>
          <AppText variant="caption" style={{ color: colors.primary, fontWeight: '900' }}>
            Add new
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function ReminderConversationCard({
  reminder,
  ready,
  onPress,
  onDelete,
}: {
  reminder: InterviewReminder;
  ready: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.session,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}>
      <View
        style={[
          styles.sessionIcon,
          { backgroundColor: ready ? colors.successTint : colors.warningTint },
        ]}>
        <Ionicons
          name={ready ? 'chatbubble-ellipses-outline' : 'alarm-outline'}
          size={24}
          color={ready ? colors.success : colors.accentGold}
        />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle">
          {ready ? 'Interview chat ready' : reminder.title}
        </AppText>
        <AppText variant="body" muted style={{ fontWeight: '700' }}>
          {ready ? `${reminder.title} • Tap to start chat` : formatReminderTime(reminder.scheduledAt)}
        </AppText>
      </View>
      <View style={styles.reminderActions}>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: ready ? colors.successTint : colors.primaryTint },
          ]}>
          <AppText
            variant="caption"
            style={{ color: ready ? colors.success : colors.primary, fontWeight: '900' }}>
            {ready ? 'Ready' : 'Scheduled'}
          </AppText>
        </View>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          hitSlop={8}
          style={[styles.deleteIconButton, { backgroundColor: colors.errorTint }]}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function ScheduleReminderSheet({
  visible,
  loading,
  onClose,
  onSelect,
  onSelectAt,
}: {
  visible: boolean;
  loading: boolean;
  onClose: () => void;
  onSelect: (minutes: number) => void;
  onSelectAt: (scheduledAt: string) => void;
}) {
  const { colors, isDark } = useAppTheme();
  const [customDateTime, setCustomDateTime] = useState(getTomorrowMorningDate);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const options = [
    { label: 'In 15 min', minutes: 15 },
    { label: 'In 30 min', minutes: 30 },
    { label: 'In 1 hour', minutes: 60 },
    { label: 'Tomorrow morning', minutes: minutesUntilTomorrowMorning() },
  ];

  useEffect(() => {
    if (visible) {
      setCustomDateTime(getTomorrowMorningDate());
      setPickerMode(null);
    }
  }, [visible]);

  function onPickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !selectedDate || !pickerMode) return;
    setCustomDateTime((current) => mergePickerValue(current, selectedDate, pickerMode));
  }

  function scheduleCustomTime() {
    if (customDateTime.getTime() <= Date.now()) {
      Alert.alert('Choose a future time', 'Please select a later date and time for your interview reminder.');
      return;
    }
    onSelectAt(customDateTime.toISOString());
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          haptic={false}
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}>
          <AppText variant="title">Schedule practice</AppText>
          <AppText variant="body" muted style={styles.sheetText}>
            Choose when AiCoche should remind you to start your mock interview.
          </AppText>
          <View style={styles.optionGrid}>
            {options.map((option) => (
              <Pressable
                key={option.label}
                disabled={loading}
                onPress={() => onSelect(option.minutes)}
                style={({ pressed }) => [
                  styles.scheduleOption,
                  {
                    backgroundColor: colors.primaryTint,
                    borderColor: colors.glow,
                    opacity: pressed || loading ? 0.75 : 1,
                  },
                ]}>
                <AppText variant="body" style={{ color: colors.primary, fontWeight: '900' }}>
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </View>
          <View style={styles.customTimeGroup}>
            <AppText variant="caption" muted style={{ fontWeight: '900' }}>
              Custom date and time
            </AppText>
            <View style={styles.customPickerRow}>
              <Pressable
                onPress={() => setPickerMode('date')}
                style={[
                  styles.customPickerButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <AppText variant="body" style={styles.customPickerText}>
                  {formatPickerDate(customDateTime)}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => setPickerMode('time')}
                style={[
                  styles.customPickerButton,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <AppText variant="body" style={styles.customPickerText}>
                  {formatPickerTime(customDateTime)}
                </AppText>
              </Pressable>
            </View>
            {pickerMode ? (
              <View style={[styles.pickerWrap, { backgroundColor: colors.surface }]}>
                <DateTimePicker
                  value={customDateTime}
                  mode={pickerMode}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={onPickerChange}
                  textColor={colors.text}
                  accentColor={colors.primary}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={styles.nativePicker}
                />
              </View>
            ) : null}
            <Button title="Schedule selected time" onPress={scheduleCustomTime} loading={loading} />
          </View>
          <Button title="Not now" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function minutesUntilTomorrowMorning() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return Math.max(1, Math.ceil((tomorrow.getTime() - now.getTime()) / 60000));
}

function getTomorrowMorningDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

function mergePickerValue(current: Date, selected: Date, mode: 'date' | 'time') {
  const next = new Date(current);
  if (mode === 'date') {
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  } else {
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  }
  return next;
}

function formatPickerDate(date: Date) {
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPickerTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PastSession({
  title,
  score,
  status,
  updatedAt,
  onPress,
}: {
  title: string;
  score: number | null;
  status: 'active' | 'completed' | 'abandoned';
  updatedAt: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.session,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}>
      <View style={[styles.sessionIcon, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name="time-outline" size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="body" muted style={{ fontWeight: '700' }}>
          {status === 'completed' ? 'Completed' : 'Saved chat'} • {formatReminderTime(updatedAt)}
        </AppText>
      </View>
      {score != null ? (
        <View style={[styles.scorePill, { backgroundColor: colors.successTint }]}>
          <Ionicons name="trophy-outline" size={16} color={colors.success} />
          <AppText variant="caption" style={{ color: colors.success, fontWeight: '900' }}>
            {score}
          </AppText>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

function EmptyState({ message }: { message: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="time-outline" size={24} color={colors.textMuted} />
      <AppText variant="body" muted style={styles.emptyText}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xxl },
  sub: { marginTop: spacing.xs, fontWeight: '800' },
  hero: {
    minHeight: 120,
    borderRadius: 22,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { marginBottom: spacing.xs },
  heroText: { fontWeight: '800' },
  reminderCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  reminderIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderText: { marginTop: spacing.xs, fontWeight: '700' },
  reminderActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sheetText: { fontWeight: '700' },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  scheduleOption: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  customTimeGroup: {
    gap: spacing.sm,
  },
  customPickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customPickerButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customPickerText: {
    fontWeight: '800',
  },
  pickerWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nativePicker: {
    alignSelf: 'stretch',
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  usageText: { fontWeight: '800' },
  usageValue: { fontWeight: '900' },
  track: { height: 8, borderRadius: 99, overflow: 'hidden', marginBottom: spacing.xxl },
  fill: { height: '100%', borderRadius: 99 },
  sectionTitle: { marginBottom: spacing.lg },
  session: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePill: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: { flex: 1, fontWeight: '800' },
});
