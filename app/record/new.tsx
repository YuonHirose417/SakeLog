import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordForm } from '@/features/records/RecordForm';
import { useCreateRecord } from '@/features/records/use-create-record';

import { useToast } from '@/components/ToastProvider';

import type { SpendingRecordInput } from '@/types/record';

export default function NewRecordScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { save, undo, saving, error } = useCreateRecord();

  const handleSubmit = async (input: SpendingRecordInput) => {
    const createdId = await save(input);

    if (createdId === null) {
      return;
    }

    router.back();

    showToast({
      message: '記録しました',
      action: {
        label: '取り消す',
        onPress: () => {
          void undo(createdId).then(() => {
            showToast({ message: '取り消しました', durationMs: 2500 });
          });
        },
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
        >
          <Text style={styles.headerCancel}>キャンセル</Text>
        </Pressable>

        <Text style={styles.headerTitle}>記録</Text>

        <View style={styles.headerButton} />
      </View>

      <RecordForm
        onSubmit={(input) => void handleSubmit(input)}
        submitting={saving}
        error={error}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4E7',
  },
  headerButton: { minWidth: 80, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  headerCancel: { fontSize: 15, color: '#52525B' },
});
