import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { HapticPressable as Pressable } from '@/src/components/ui/HapticPressable';
import { Screen } from '@/src/components/ui/Screen';
import { uploadProfileAvatar } from '@/src/lib/profilePersistence';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';
import { FREE_CHAT_LIMIT, FREE_CV_LIMIT, useUsageStore } from '@/src/store/usageStore';
import { spacing } from '@/src/theme/tokens';

function usefulProfileText(value: string) {
  return /ai career coach app/i.test(value) ? '' : value;
}

function usefulProfileName(value: string) {
  return /^(test|expense tracker app)$/i.test(value.trim()) ? '' : value;
}

function labelExperience(id: string) {
  if (id === 'beginner') return 'Beginner (0–1 years)';
  if (id === 'intermediate') return 'Intermediate (1–3 years)';
  if (id === 'experienced') return 'Experienced (3+ years)';
  return '—';
}

function labelGoal(id: string) {
  const m: Record<string, string> = {
    job: 'Get a Job',
    switch: 'Switch Career',
    freelance: 'Freelancing',
    skills: 'Improve Skills',
  };
  return m[id] ?? '—';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const email = useSessionStore((s) => s.email);
  const displayName = useSessionStore((s) => s.displayName);
  const logout = useSessionStore((s) => s.logout);

  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const professionLabel = useProfileStore((s) => s.professionLabel);
  const experience = useProfileStore((s) => s.experience);
  const goal = useProfileStore((s) => s.goal);
  const language = useProfileStore((s) => s.language);
  const professionalProfile = useProfileStore((s) => s.professionalProfile);
  const setOnboardingField = useProfileStore((s) => s.setOnboardingField);
  const updateProfessionalProfile = useProfileStore((s) => s.updateProfessionalProfile);
  const setAvatarUrl = useProfileStore((s) => s.setAvatarUrl);
  const skills = useProfileStore((s) => s.skills);
  const tools = useProfileStore((s) => s.tools);
  const projects = useProfileStore((s) => s.projects);
  const addSkill = useProfileStore((s) => s.addSkill);
  const removeSkill = useProfileStore((s) => s.removeSkill);
  const addTool = useProfileStore((s) => s.addTool);
  const removeTool = useProfileStore((s) => s.removeTool);
  const addProject = useProfileStore((s) => s.addProject);
  const removeProject = useProfileStore((s) => s.removeProject);
  const cvAnalysesUsed = useUsageStore((s) => s.cvAnalysesUsed);
  const chatsUsed = useUsageStore((s) => s.chatsUsed);
  const setPlan = useUsageStore((s) => s.setPlan);

  const [modal, setModal] = useState<'skill' | 'tool' | 'project' | null>(null);
  const [draft, setDraft] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const accountName = usefulProfileName(displayName) || email.split('@')[0] || 'User';
  const profileName = accountName;
  const [profileDraft, setProfileDraft] = useState({
    fullName: profileName,
    professionLabel,
    language,
  });
  const visibleName = profileName || 'Your profile';

  function saveDraft() {
    if (!modal) return;
    const t = draft.trim();
    if (!t) return;
    if (modal === 'skill') addSkill(t);
    if (modal === 'tool') addTool(t);
    if (modal === 'project') addProject(t);
    setDraft('');
    setModal(null);
  }

  function openEditProfile() {
    setProfileDraft({
      fullName: accountName,
      professionLabel,
      language,
    });
    setEditOpen(true);
  }

  function saveProfileDetails() {
    const fullName = profileDraft.fullName.trim();
    const nextProfession = profileDraft.professionLabel.trim();
    const nextLanguage = profileDraft.language.trim() || 'English';

    updateProfessionalProfile({
      fullName,
      headline: nextProfession || professionalProfile.headline,
      currentDesignation: nextProfession || professionalProfile.currentDesignation,
      source: 'manual',
    });
    setOnboardingField({
      professionLabel: nextProfession,
      language: nextLanguage,
    });
    setEditOpen(false);
  }

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;

    try {
      setUploadingAvatar(true);
      const publicUrl = await uploadProfileAvatar({
        uri: asset.uri,
        mimeType: asset.mimeType,
        base64: asset.base64,
      });
      setAvatarUrl(publicUrl);
    } catch (error) {
      Alert.alert(
        'Upload failed',
        error instanceof Error ? error.message : 'Could not upload your profile image.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function signOut() {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Sign out failed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <AppText variant="display">Profile</AppText>
        <Button title="Sign out" variant="ghost" onPress={confirmSignOut} />
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          onPress={pickAvatar}
          disabled={uploadingAvatar}
          style={[styles.avatar, { backgroundColor: colors.primaryTint }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person-outline" size={46} color={colors.primary} />
          )}
          <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name={uploadingAvatar ? 'hourglass-outline' : 'camera-outline'} size={15} color={colors.textInverse} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText variant="title">{visibleName}</AppText>
          <AppText variant="body" muted style={{ fontWeight: '800', marginVertical: 2 }}>
            {email || 'No email'}
          </AppText>
          <View style={[styles.rolePill, { backgroundColor: colors.primaryTint }]}>
            <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
            <AppText variant="caption" style={{ color: colors.primary, fontWeight: '900' }}>
              {usefulProfileText(professionLabel) || usefulProfileText(professionalProfile.currentDesignation) || 'Profession not set'}
            </AppText>
          </View>
        </View>
        <Pressable onPress={openEditProfile} hitSlop={8}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <InfoRow icon="trending-up-outline" color={colors.primary} label="Experience" value={labelExperience(experience ?? '')} />
        <InfoRow icon="ribbon-outline" color={colors.success} label="Career Goal" value={labelGoal(goal ?? '')} />
        <InfoRow icon="globe-outline" color={colors.accentGold} label="Language" value={language || 'English'} />
      </View>

      <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.planIcon, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="flash-outline" size={28} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">Free Plan</AppText>
          <AppText variant="body" muted style={{ fontWeight: '800' }}>
            Limited to 10 interviews & 1 CV analysis
          </AppText>
        </View>
        <Button
          title="Upgrade to Pro"
          leftIcon={<Ionicons name="diamond-outline" size={18} color={colors.textInverse} />}
          onPress={() => setPlan('pro')}
          style={styles.upgradeButton}
        />
      </View>

      <Section
        title="Skills"
        items={skills}
        onAdd={() => setModal('skill')}
        onRemove={removeSkill}
        tone="primary"
      />
      <Section
        title="Tools"
        items={tools}
        onAdd={() => setModal('tool')}
        onRemove={removeTool}
        tone="success"
      />
      <Section
        title="Projects"
        items={projects}
        onAdd={() => setModal('project')}
        onRemove={removeProject}
        tone="neutral"
      />

      <AppText variant="title" style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
        Usage
      </AppText>
      <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <UsageRow icon="document-text-outline" label="CV Analyses" value={`${cvAnalysesUsed}/${FREE_CV_LIMIT}`} />
        <UsageRow icon="chatbubble-outline" label="Interviews" value={`${chatsUsed}/${FREE_CHAT_LIMIT}`} />
      </View>

      <Modal visible={modal != null} transparent animationType="fade">
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setModal(null)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}>
            <AppText variant="subtitle">
              Add {modal === 'skill' ? 'skill' : modal === 'tool' ? 'tool' : 'project'}
            </AppText>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Name"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            <Button title="Save" onPress={saveDraft} />
            <Button title="Cancel" variant="ghost" onPress={() => setModal(null)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editOpen} transparent animationType="fade">
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setEditOpen(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}>
            <AppText variant="subtitle">Edit profile</AppText>
            <TextInput
              value={profileDraft.fullName}
              onChangeText={(fullName) => setProfileDraft((current) => ({ ...current, fullName }))}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
            <TextInput
              value={profileDraft.professionLabel}
              onChangeText={(nextProfession) =>
                setProfileDraft((current) => ({ ...current, professionLabel: nextProfession }))
              }
              placeholder="Profession"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
            <TextInput
              value={profileDraft.language}
              onChangeText={(nextLanguage) =>
                setProfileDraft((current) => ({ ...current, language: nextLanguage }))
              }
              placeholder="Preferred language"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
            <Button title="Save changes" onPress={saveProfileDetails} />
            <Button title="Cancel" variant="ghost" onPress={() => setEditOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Section({
  title,
  items,
  onAdd,
  onRemove,
  tone,
}: {
  title: string;
  items: string[];
  onAdd: () => void;
  onRemove: (s: string) => void;
  tone: 'primary' | 'success' | 'neutral';
}) {
  const { colors } = useAppTheme();
  const chipColor = tone === 'success' ? colors.success : tone === 'primary' ? colors.primary : colors.textMuted;
  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={styles.sectionHead}>
        <AppText variant="title">{title}</AppText>
        <Pressable onPress={onAdd} hitSlop={8}>
          <Ionicons name="pencil-outline" size={25} color={colors.primary} />
        </Pressable>
      </View>
      <View style={[styles.chipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {items.length === 0 ? (
          <AppText variant="caption" muted>
            Nothing added yet
          </AppText>
        ) : (
          items.map((x) => (
            <Pressable key={x} onPress={() => onRemove(x)} style={styles.chipWrap}>
              <View style={[styles.chip, { backgroundColor: `${chipColor}13` }]}>
                <AppText variant="caption" style={{ color: chipColor, fontWeight: '900' }}>
                  {x}
                </AppText>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  color,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={color} />
      <AppText variant="body" muted style={{ flex: 1, fontWeight: '900' }}>
        {label}
      </AppText>
      <AppText variant="body" style={{ fontWeight: '900' }}>
        {value}
      </AppText>
    </View>
  );
}

function UsageRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.usageRow}>
      <Ionicons name={icon} size={21} color={colors.primary} />
      <AppText variant="body" style={{ flex: 1, fontWeight: '900' }}>
        {label}
      </AppText>
      <AppText variant="body" style={{ fontWeight: '900' }}>
        {value}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  planCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
  },
  planIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  upgradeButton: { marginTop: spacing.lg },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  chipCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipWrap: {},
  usageCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalSheet: {
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
  },
});
