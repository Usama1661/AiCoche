import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { HapticPressable as Pressable } from '@/src/components/ui/HapticPressable';
import { Screen } from '@/src/components/ui/Screen';
import { saveQuizResult } from '@/src/lib/api/metrics';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

function labelExperience(id: string | null) {
  if (id === 'beginner') return 'beginner';
  if (id === 'intermediate') return 'intermediate';
  if (id === 'experienced') return 'experienced';
  return 'growing';
}

function labelGoal(id: string | null) {
  const m: Record<string, string> = {
    job: 'getting a job',
    switch: 'switching careers',
    freelance: 'freelancing',
    skills: 'improving skills',
  };
  return id ? (m[id] ?? 'improving skills') : 'improving skills';
}

function quizLevel(score: number) {
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Advanced';
  if (score >= 60) return 'Skilled';
  if (score >= 40) return 'Growing';
  return 'Starter';
}

function buildQuiz(params: {
  professionLabel: string;
  experience: string | null;
  goal: string | null;
  language: string;
  skills: string[];
  tools: string[];
  projects: string[];
}): QuizQuestion[] {
  const profession = params.professionLabel || 'Professional';
  const experience = labelExperience(params.experience);
  const goal = labelGoal(params.goal);
  const skill = params.skills[0] ?? 'problem solving';
  const tool = params.tools[0] ?? 'your main tool';
  const project = params.projects[0] ?? 'a recent project';
  const language = params.language || 'English';

  return [
    {
      question: `As a ${profession} focused on ${goal}, what should you highlight first in your profile?`,
      options: [
        'Only the list of tools you have installed',
        'Relevant skills backed by clear project outcomes',
        'A long personal story without results',
        'Every job task you have ever done',
      ],
      correctIndex: 1,
      explanation: 'Strong profiles connect skills to outcomes so recruiters can see evidence quickly.',
    },
    {
      question: `For your ${experience} level, what is the best way to answer a technical quiz question?`,
      options: [
        'Guess quickly and move on',
        'Explain your reasoning, trade-offs, and final choice',
        'Avoid mentioning what you do not know',
        'Give the shortest answer possible every time',
      ],
      correctIndex: 1,
      explanation: 'AI can score reasoning better when you explain the path, not just the final answer.',
    },
    {
      question: `You listed "${skill}" as a skill. What proves it best?`,
      options: [
        'Saying you are passionate about it',
        'Repeating the skill many times',
        'A project, metric, or example showing how you used it',
        'Adding it only to your bio headline',
      ],
      correctIndex: 2,
      explanation: 'Evidence from real work makes a skill credible.',
    },
    {
      question: `When discussing "${tool}", what kind of answer sounds strongest?`,
      options: [
        'How the tool helped you complete a real workflow',
        'That you opened it once',
        'That everyone in the industry uses it',
        'A memorized definition only',
      ],
      correctIndex: 0,
      explanation: 'Hiring and learning assessments reward practical use over name-dropping.',
    },
    {
      question: `If asked about ${project}, which structure gives the clearest answer?`,
      options: [
        'Problem, action, result, and what you learned',
        'Only the project name',
        'All technical details with no outcome',
        'What your teammate did',
      ],
      correctIndex: 0,
      explanation: 'A simple problem-action-result structure shows ownership and impact.',
    },
    {
      question: `Your preferred language is ${language}. How should AI quiz feedback be used after the score?`,
      options: [
        'Ignore feedback if the score is good',
        'Review weak areas and practice the next quiz around them',
        'Retake the same quiz without learning anything',
        'Change your profile randomly',
      ],
      correctIndex: 1,
      explanation: 'The score is useful when it turns into targeted practice for your next level.',
    },
  ];
}

export default function AiQuizScreen() {
  const { colors } = useAppTheme();
  const profile = useProfileStore();
  const lastQuizScore = useMetricsStore((s) => s.lastQuizScore);
  const lastQuizLevel = useMetricsStore((s) => s.lastQuizLevel);
  const setLastQuizResult = useMetricsStore((s) => s.setLastQuizResult);

  const questions = useMemo(
    () =>
      buildQuiz({
        professionLabel: profile.professionLabel,
        experience: profile.experience,
        goal: profile.goal,
        language: profile.language,
        skills: profile.skills,
        tools: profile.tools,
        projects: profile.projects,
      }),
    [
      profile.experience,
      profile.goal,
      profile.language,
      profile.professionLabel,
      profile.projects,
      profile.skills,
      profile.tools,
    ]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; level: string } | null>(null);
  const current = questions[currentIndex];
  const progress = `${currentIndex + 1} / ${questions.length}`;

  function restart() {
    setCurrentIndex(0);
    setSelectedIndex(null);
    setAnswers([]);
    setResult(null);
  }

  function submitAnswer() {
    if (selectedIndex == null) return;
    const nextAnswers = [...answers, selectedIndex];
    const nextIndex = currentIndex + 1;

    if (nextIndex < questions.length) {
      setAnswers(nextAnswers);
      setCurrentIndex(nextIndex);
      setSelectedIndex(null);
      return;
    }

    const correct = nextAnswers.reduce(
      (sum, answer, index) => sum + (answer === questions[index]!.correctIndex ? 1 : 0),
      0
    );
    const score = Math.round((correct / questions.length) * 100);
    const level = quizLevel(score);
    setAnswers(nextAnswers);
    setResult({ score, level });
    setLastQuizResult(score, level);
    saveQuizResult({
      topic: profile.professionLabel || 'AI Quiz',
      questions,
      answers: nextAnswers,
      score,
    }).catch(() => {});
  }

  if (result) {
    return (
      <Screen scroll>
        <View style={styles.header}>
          <AppText variant="display">AI Quiz</AppText>
          <AppText variant="body" muted style={styles.sub}>
            Your personalized skill level is ready.
          </AppText>
        </View>

        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.resultIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="trophy-outline" size={40} color={colors.textInverse} />
          </View>
          <AppText variant="display" style={{ color: colors.accentGold }}>
            {result.score}%
          </AppText>
          <AppText variant="title">{result.level} Level</AppText>
          <AppText variant="body" muted style={styles.resultText}>
            This score is now shown on your dashboard. Retake the quiz anytime after updating your
            profile, skills, tools, or projects.
          </AppText>
        </View>

        <AppText variant="title" style={styles.sectionTitle}>
          AI Feedback
        </AppText>
        {questions.map((question, index) => {
          const chosen = answers[index];
          const correct = chosen === question.correctIndex;
          return (
            <View
              key={question.question}
              style={[styles.feedbackCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.feedbackHead}>
                <Ionicons
                  name={correct ? 'checkmark-circle-outline' : 'close-circle-outline'}
                  size={23}
                  color={correct ? colors.success : colors.error}
                />
                <AppText variant="body" style={{ flex: 1, fontWeight: '900' }}>
                  Question {index + 1}
                </AppText>
              </View>
              <AppText variant="body" muted style={styles.feedbackText}>
                {question.explanation}
              </AppText>
            </View>
          );
        })}

        <Button title="Retake AI Quiz" onPress={restart} style={styles.bottomButton} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="display">AI Quiz</AppText>
        <AppText variant="body" muted style={styles.sub}>
          Personalized for your profile and background.
        </AppText>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="briefcase-outline" size={22} color={colors.primary} />
          <AppText variant="caption" muted style={styles.summaryLabel}>
            Profile
          </AppText>
          <AppText variant="body" style={styles.summaryValue} numberOfLines={1}>
            {profile.professionLabel || 'Profession not set'}
          </AppText>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="analytics-outline" size={22} color={colors.success} />
          <AppText variant="caption" muted style={styles.summaryLabel}>
            Last Level
          </AppText>
          <AppText variant="body" style={styles.summaryValue}>
            {lastQuizScore != null ? `${lastQuizLevel} ${lastQuizScore}%` : 'Not taken'}
          </AppText>
        </View>
      </View>

      <View style={[styles.quizCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.quizHead}>
          <View style={[styles.badge, { backgroundColor: colors.primaryTint }]}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: '900' }}>
              AI Question
            </AppText>
          </View>
          <AppText variant="caption" muted style={{ fontWeight: '900' }}>
            {progress}
          </AppText>
        </View>

        <AppText variant="title" style={styles.question}>
          {current.question}
        </AppText>

        <View style={styles.options}>
          {current.options.map((option, index) => {
            const selected = selectedIndex === index;
            return (
              <Pressable
                key={option}
                onPress={() => setSelectedIndex(index)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: selected ? colors.primaryTint : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.radio,
                    { borderColor: selected ? colors.primary : colors.textMuted },
                    selected && { backgroundColor: colors.primary },
                  ]}>
                  {selected ? <Ionicons name="checkmark" size={14} color={colors.textInverse} /> : null}
                </View>
                <AppText variant="body" style={styles.optionText}>
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <Button
          title={currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          onPress={submitAnswer}
          disabled={selectedIndex == null}
          style={styles.bottomButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xxl },
  sub: { marginTop: spacing.xs, fontWeight: '800' },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
  },
  summaryLabel: { marginTop: spacing.sm, fontWeight: '800' },
  summaryValue: { marginTop: spacing.xs, fontWeight: '900' },
  quizCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  quizHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  question: { marginBottom: spacing.xl },
  options: { gap: spacing.md },
  option: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, fontWeight: '800' },
  bottomButton: { marginTop: spacing.xl },
  resultCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  resultIcon: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  resultText: {
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '800',
  },
  sectionTitle: { marginBottom: spacing.lg },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  feedbackHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  feedbackText: { fontWeight: '800' },
});
