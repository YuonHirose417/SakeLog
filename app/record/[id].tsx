import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordForm } from '@/features/records/RecordForm';
import { restoreRecord, useEditRecord } from '@/features/records/use-edit-record';

import { useToast } from '@/components/ToastProvider';

import { useBumpDataRevision } from '@/store/use-app-store';

import type { SpendingRecordInput } from '@/types/record';

export default function EditRecordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);

  const { record, loading, saving, error, update, remove } = useEditRecord(id);
  const { showToast } = useToast();
  const bumpDataRevision = useBumpDataRevision();

  const handleSubmit = async (input: SpendingRecordInput) => {
    const updated = await update(input);

    if (!updated) {
      return;
    }

    router.back();
    showToast({ message: '更新しました', durationMs: 2500 });
  };

  const handleDelete = async () => {
    if (record === null) {
      return;
    }

    // 復元できるように削除前の内容を控えておく
    const snapshot = record;
    const deleted = await remove();

    if (!deleted) {
      return;
    }

    router.back();

    showToast({
      message: '削除しました',
      action: {
        label: '取り消す',
        onPress: () => {
          void restoreRecord(snapshot).then(() => {
            bumpDataRevision();
            showToast({ message: '元に戻しました', durationMs: 2500 });
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

        <Text style={styles.headerTitle}>記録の編集</Text>

        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} />
      ) : record === null ? (
        <View style={styles.missing}>
          <Text style={styles.missingText}>この記録は見つかりませんでした。</Text>
        </View>
      ) : (
        <RecordForm
          initialValues={{
            amount: record.amount,
            category: record.category,
            drinkType: record.drinkType,
            isSolo: record.isSolo,
            memo: record.memo ?? '',
            spentAt: record.spentAt,
            companionNames: record.companions.map((companion) => companion.name),
          }}
          onSubmit={(input) => void handleSubmit(input)}
          submitting={saving}
          error={error}
          footer={
            <Pressable
              onPress={() => void handleDelete()}
              disabled={saving}
              style={styles.deleteButton}
              accessibilityRole="button"
            >
              <Text style={styles.deleteLabel}>この記録を削除</Text>
            </Pressable>
          }
        />
      )}
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
  loading: { marginTop: 32 },
  missing: { padding: 24 },
  missingText: { fontSize: 15, color: '#52525B' },
  deleteButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { fontSize: 15, color: '#B91C1C' },
});
