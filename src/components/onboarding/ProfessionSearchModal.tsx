import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { HapticPressable as Pressable } from '@/src/components/ui/HapticPressable';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { searchProfessions, type Profession } from '@/src/lib/professions';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (p: Profession) => void;
  current?: Profession | null;
};

export function ProfessionSearchModal({
  visible,
  onClose,
  onSelect,
  current,
}: Props) {
  const { colors } = useAppTheme();
  const [q, setQ] = useState('');
  const list = useMemo(() => searchProfessions(q), [q]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <AppText variant="title" style={{ marginBottom: spacing.md }}>
            Select profession
          </AppText>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search roles..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.search,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
          <FlatList
            data={list}
            keyExtractor={(item) => item.key}
            style={{ maxHeight: 360 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                  setQ('');
                }}
                style={[
                  styles.row,
                  current?.key === item.key && {
                    backgroundColor: colors.primaryTint,
                  },
                ]}>
                <AppText variant="body">{item.label}</AppText>
              </Pressable>
            )}
          />
          <Button title="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.md,
  },
  search: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
});
