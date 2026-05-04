import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppHeader } from '@/src/components/layout/AppHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { parseProfessionalProfileFromResume } from '@/src/lib/resumeProfileParser';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';
import type { Certification, ProfessionalExperience, ProfessionalProfile } from '@/src/types/user';

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function listToText(items: string[]) {
  return items.join(', ');
}

function textToList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function emptyExperience(): ProfessionalExperience {
  return {
    id: makeId('experience'),
    company: '',
    title: '',
    startDate: '',
    endDate: '',
    responsibilities: [],
    skills: [],
  };
}

function emptyCertification(): Certification {
  return {
    id: makeId('certification'),
    name: '',
    issuer: '',
    date: '',
  };
}

export default function ProfessionalProfileScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const displayName = useSessionStore((s) => s.displayName);
  const professionLabel = useProfileStore((s) => s.professionLabel);
  const profile = useProfileStore((s) => s.professionalProfile);
  const updateProfessionalProfile = useProfileStore((s) => s.updateProfessionalProfile);
  const replaceProfessionalProfile = useProfileStore((s) => s.replaceProfessionalProfile);
  const lastCvText = useMetricsStore((s) => s.lastCvText);
  const lastCvFileName = useMetricsStore((s) => s.lastCvFileName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfessionalProfile>(profile);

  useEffect(() => {
    if (!editing) setDraft(profile);
  }, [editing, profile]);

  const hasProfile =
    Boolean(profile.updatedAt) ||
    Boolean(profile.bio) ||
    profile.experiences.length > 0 ||
    profile.technicalSkills.length > 0 ||
    profile.softSkills.length > 0 ||
    profile.certifications.length > 0;

  const visibleName = profile.fullName || displayName || 'Your Name';
  const visibleHeadline = profile.headline || professionLabel || 'Add your headline';

  useEffect(() => {
    if (hasProfile || !lastCvText.trim()) return;
    replaceProfessionalProfile(
      parseProfessionalProfileFromResume({
        resumeText: lastCvText,
        fileName: lastCvFileName,
        displayName,
        fallbackHeadline: professionLabel,
      })
    );
  }, [
    displayName,
    hasProfile,
    lastCvFileName,
    lastCvText,
    professionLabel,
    replaceProfessionalProfile,
  ]);

  function patchDraft(patch: Partial<ProfessionalProfile>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateExperience(id: string, patch: Partial<ProfessionalExperience>) {
    patchDraft({
      experiences: draft.experiences.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  }

  function updateCertification(id: string, patch: Partial<Certification>) {
    patchDraft({
      certifications: draft.certifications.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  }

  function save() {
    updateProfessionalProfile({
      ...draft,
      source: draft.source === 'resume' ? 'resume' : 'manual',
    });
    setEditing(false);
  }

  return (
    <Screen scroll keyboard>
      <AppHeader
        title="Your Profile"
        subtitle="Professional profile"
        onBack={() => router.back()}
        right={
          editing ? (
            <Pressable
              onPress={() => {
                setDraft(profile);
                setEditing(false);
              }}
              hitSlop={8}>
              <AppText variant="caption" style={{ color: colors.textMuted, fontWeight: '900' }}>
                Cancel
              </AppText>
            </Pressable>
          ) : (
            <Pressable onPress={() => setEditing(true)} hitSlop={8}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </Pressable>
          )
        }
      />

      {!hasProfile ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="id-card-outline" size={34} color={colors.primary} />
          </View>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            Build your professional profile
          </AppText>
          <AppText variant="body" muted style={styles.emptyText}>
            Upload a CV to auto-fill your career details, or add your summary, experience, and
            skills manually.
          </AppText>
          <View style={styles.emptyActions}>
            <Button title="Upload CV" onPress={() => router.push('/cv-upload')} style={{ flex: 1 }} />
            <Button title="Add manually" variant="secondary" onPress={() => setEditing(true)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}

      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cover} />
        <View style={[styles.avatar, { borderColor: colors.card }]}>
          <Ionicons name="person-outline" size={42} color={colors.primary} />
        </View>
        <View style={styles.heroBody}>
          {editing ? (
            <>
              <Field label="Full name" value={draft.fullName} onChangeText={(fullName) => patchDraft({ fullName })} />
              <Field label="Headline / designation" value={draft.headline} onChangeText={(headline) => patchDraft({ headline })} />
            </>
          ) : (
            <>
              <AppText variant="title">{visibleName}</AppText>
              <AppText variant="body" muted style={styles.boldText}>
                {visibleHeadline}
              </AppText>
            </>
          )}
          <View style={[styles.sourcePill, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: '900' }}>
              {profile.source === 'resume' ? 'Auto-filled from CV' : 'Editable profile'}
            </AppText>
          </View>
        </View>
      </View>

      <SectionCard title="Professional Summary" icon="reader-outline">
        {editing ? (
          <Field
            label="Bio / summary"
            value={draft.bio}
            onChangeText={(bio) => patchDraft({ bio })}
            multiline
            placeholder="Summarize your background, strengths, and career focus."
          />
        ) : (
          <AppText variant="body" muted={!profile.bio} style={styles.paragraph}>
            {profile.bio || 'No professional summary added yet.'}
          </AppText>
        )}
      </SectionCard>

      <SectionCard
        title="Current Employment"
        icon="briefcase-outline"
        action={
          editing ? null : (
            <AppText variant="caption" muted>
              {profile.employmentStatus || 'Not set'}
            </AppText>
          )
        }>
        {editing ? (
          <>
            <Field label="Current company" value={draft.currentCompany} onChangeText={(currentCompany) => patchDraft({ currentCompany })} />
            <Field label="Current designation" value={draft.currentDesignation} onChangeText={(currentDesignation) => patchDraft({ currentDesignation })} />
            <Field label="Employment status" value={draft.employmentStatus} onChangeText={(employmentStatus) => patchDraft({ employmentStatus })} placeholder="Employed, Open to work, Freelance..." />
          </>
        ) : (
          <View style={styles.currentGrid}>
            <InfoTile label="Company" value={profile.currentCompany || 'Add company'} />
            <InfoTile label="Designation" value={profile.currentDesignation || visibleHeadline} />
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Work Experience"
        icon="business-outline"
        action={
          editing ? (
            <Pressable
              onPress={() => patchDraft({ experiences: [...draft.experiences, emptyExperience()] })}
              hitSlop={8}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </Pressable>
          ) : null
        }>
        {editing ? (
          draft.experiences.length ? (
            draft.experiences.map((item) => (
              <EditableExperience
                key={item.id}
                experience={item}
                onChange={(patch) => updateExperience(item.id, patch)}
                onRemove={() =>
                  patchDraft({ experiences: draft.experiences.filter((exp) => exp.id !== item.id) })
                }
              />
            ))
          ) : (
            <Button
              title="Add Experience"
              variant="secondary"
              onPress={() => patchDraft({ experiences: [emptyExperience()] })}
            />
          )
        ) : profile.experiences.length ? (
          profile.experiences.map((item) => <ExperienceCard key={item.id} experience={item} />)
        ) : (
          <AppText variant="body" muted>
            Add companies, job titles, employment dates, achievements, and role-specific skills.
          </AppText>
        )}
      </SectionCard>

      <SectionCard title="Skills" icon="construct-outline">
        {editing ? (
          <>
            <Field
              label="Technical skills"
              value={listToText(draft.technicalSkills)}
              onChangeText={(value) => patchDraft({ technicalSkills: textToList(value) })}
              placeholder="React Native, TypeScript, SQL"
            />
            <Field
              label="Soft skills"
              value={listToText(draft.softSkills)}
              onChangeText={(value) => patchDraft({ softSkills: textToList(value) })}
              placeholder="Communication, leadership, problem solving"
            />
          </>
        ) : (
          <>
            <ChipGroup title="Technical" items={profile.technicalSkills} />
            <ChipGroup title="Soft" items={profile.softSkills} />
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Certifications"
        icon="ribbon-outline"
        action={
          editing ? (
            <Pressable
              onPress={() => patchDraft({ certifications: [...draft.certifications, emptyCertification()] })}
              hitSlop={8}>
              <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
            </Pressable>
          ) : null
        }>
        {editing ? (
          draft.certifications.length ? (
            draft.certifications.map((item) => (
              <EditableCertification
                key={item.id}
                certification={item}
                onChange={(patch) => updateCertification(item.id, patch)}
                onRemove={() =>
                  patchDraft({
                    certifications: draft.certifications.filter((certification) => certification.id !== item.id),
                  })
                }
              />
            ))
          ) : (
            <Button
              title="Add Certification"
              variant="secondary"
              onPress={() => patchDraft({ certifications: [emptyCertification()] })}
            />
          )
        ) : profile.certifications.length ? (
          profile.certifications.map((item) => (
            <View key={item.id} style={[styles.certRow, { borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={styles.boldText}>
                  {item.name}
                </AppText>
                <AppText variant="caption" muted>
                  {[item.issuer, item.date].filter(Boolean).join(' • ') || 'Certification'}
                </AppText>
              </View>
            </View>
          ))
        ) : (
          <AppText variant="body" muted>
            Certifications and badges are optional. Add them when they strengthen your profile.
          </AppText>
        )}
      </SectionCard>

      {editing ? <Button title="Save Profile" onPress={save} style={styles.saveButton} /> : null}
    </Screen>
  );
}

function SectionCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name={icon} size={21} color={colors.primary} />
          <AppText variant="subtitle">{title}</AppText>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.fieldWrap}>
      <AppText variant="caption" muted style={styles.fieldLabel}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline ? styles.multilineInput : null,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
        ]}
      />
    </View>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.infoTile, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <AppText variant="caption" muted style={styles.boldText}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.boldText}>
        {value}
      </AppText>
    </View>
  );
}

function ExperienceCard({ experience }: { experience: ProfessionalExperience }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.experienceCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <AppText variant="subtitle">{experience.title || 'Role title'}</AppText>
      <AppText variant="body" muted style={styles.boldText}>
        {experience.company || 'Company'} • {[experience.startDate, experience.endDate].filter(Boolean).join(' - ') || 'Dates'}
      </AppText>
      {experience.responsibilities.length ? (
        <View style={styles.bulletList}>
          {experience.responsibilities.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <AppText variant="body" muted style={{ flex: 1 }}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      {experience.skills.length ? <ChipGroup title="Skills used" items={experience.skills} /> : null}
    </View>
  );
}

function EditableExperience({
  experience,
  onChange,
  onRemove,
}: {
  experience: ProfessionalExperience;
  onChange: (patch: Partial<ProfessionalExperience>) => void;
  onRemove: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.editBlock, { borderColor: colors.border }]}>
      <View style={styles.editBlockHeader}>
        <AppText variant="body" style={styles.boldText}>
          Experience
        </AppText>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </Pressable>
      </View>
      <Field label="Job title" value={experience.title} onChangeText={(title) => onChange({ title })} />
      <Field label="Company" value={experience.company} onChangeText={(company) => onChange({ company })} />
      <View style={styles.dateRow}>
        <View style={{ flex: 1 }}>
          <Field label="Start" value={experience.startDate} onChangeText={(startDate) => onChange({ startDate })} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="End" value={experience.endDate} onChangeText={(endDate) => onChange({ endDate })} placeholder="Present" />
        </View>
      </View>
      <Field
        label="Responsibilities / achievements"
        value={experience.responsibilities.join('\n')}
        onChangeText={(value) => onChange({ responsibilities: textToList(value) })}
        multiline
        placeholder="Led feature delivery&#10;Improved release quality"
      />
      <Field
        label="Skills used"
        value={listToText(experience.skills)}
        onChangeText={(value) => onChange({ skills: textToList(value) })}
        placeholder="React Native, API design"
      />
    </View>
  );
}

function EditableCertification({
  certification,
  onChange,
  onRemove,
}: {
  certification: Certification;
  onChange: (patch: Partial<Certification>) => void;
  onRemove: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.editBlock, { borderColor: colors.border }]}>
      <View style={styles.editBlockHeader}>
        <AppText variant="body" style={styles.boldText}>
          Certification
        </AppText>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </Pressable>
      </View>
      <Field label="Name" value={certification.name} onChangeText={(name) => onChange({ name })} />
      <Field label="Issuer" value={certification.issuer} onChangeText={(issuer) => onChange({ issuer })} />
      <Field label="Date" value={certification.date} onChangeText={(date) => onChange({ date })} />
    </View>
  );
}

function ChipGroup({ title, items }: { title: string; items: string[] }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.chipGroup}>
      <AppText variant="caption" muted style={styles.boldText}>
        {title}
      </AppText>
      <View style={styles.chips}>
        {items.length ? (
          items.map((item) => (
            <View key={item} style={[styles.chip, { backgroundColor: `${colors.primary}14` }]}>
              <AppText variant="caption" style={{ color: colors.primary, fontWeight: '900' }}>
                {item}
              </AppText>
            </View>
          ))
        ) : (
          <AppText variant="caption" muted>
            Nothing added yet
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyText: { textAlign: 'center', fontWeight: '700', marginTop: spacing.sm },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  cover: {
    height: 92,
    backgroundColor: '#1D4ED8',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 24,
    borderWidth: 4,
    backgroundColor: 'rgba(79,70,229,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -43,
    marginLeft: spacing.xl,
  },
  heroBody: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  sourcePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paragraph: { fontWeight: '700' },
  currentGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoTile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
  experienceCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bulletList: { gap: spacing.sm, marginTop: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  chipGroup: { gap: spacing.sm },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  certRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  fieldWrap: { gap: spacing.xs },
  fieldLabel: { fontWeight: '900', textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    minHeight: 50,
  },
  multilineInput: {
    minHeight: 116,
  },
  editBlock: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  editBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  saveButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  boldText: { fontWeight: '800' },
});
