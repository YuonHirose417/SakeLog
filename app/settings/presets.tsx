import { useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Stack } from 'expo-router';

import { usePresetEditor } from '@/features/records/use-preset-editor';
import { usePresets } from '@/features/records/use-presets';

import { EmptyState } from '@/components/EmptyState';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SwipeToDeleteRow } from '@/components/SwipeToDeleteRow';
import { useToast } from '@/components/ToastProvider';

import { formatYen, parseAmountDigits } from '@/lib/currency';
import {
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  DRINK_TYPE_LABELS,
  DRINK_TYPE_OPTIONS,
} from '@/lib/labels';

import type { Preset, PresetInput } from '@/types/preset';
import type { Category, DrinkType } from '@/types/record';

/** 編集中の対象。null = フォームを閉じている、'new' = 新規追加。 */
type EditorTarget = Preset | 'new' | null;

export default function PresetsScreen() {
  const { presets, loading } = usePresets();
  const { create, update, remove, restore, saving, error } = usePresetEditor();
  const { showToast } = useToast();

  const [target, setTarget] = useState<EditorTarget>(null);

  const handleDelete = async (preset: Preset) => {
    const deleted = await remove(preset);

    if (!deleted) {
      return;
    }

    // 編集中のものを消したらフォームも閉じる
    setTarget((current) => (current !== 'new' && current?.id === preset.id ? null : current));

    showToast({
      message: '削除しました',
      action: {
        label: '取り消す',
        onPress: () => {
          void restore(preset).then(() => {
            showToast({ message: '元に戻しました', durationMs: 2500 });
          });
        },
      },
    });
  };

  const handleSubmit = async (input: PresetInput) => {
    const saved =
      target === 'new' || target === null ? await create(input) : await update(target.id, input);

    if (!saved) {
      return;
    }

    setTarget(null);
    showToast({ message: target === 'new' ? '追加しました' : '保存しました', durationMs: 2500 });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: true, title: 'よく買う酒の管理' }} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          ホームに並ぶボタンです。タップすると確認なしで記録されます。
        </Text>

        {target !== null ? (
          <PresetForm
            key={target === 'new' ? 'new' : target.id}
            preset={target === 'new' ? null : target}
            submitting={saving}
            error={error}
            onSubmit={(input) => void handleSubmit(input)}
            onCancel={() => setTarget(null)}
          />
        ) : (
          <Pressable
            onPress={() => setTarget('new')}
            style={styles.addButton}
            accessibilityRole="button"
          >
            <Text style={styles.addLabel}>＋ プリセットを追加</Text>
          </Pressable>
        )}

        {!loading && presets.length === 0 && target === null && (
          <EmptyState
            title="プリセットがありません"
            description="よく買う組み合わせを登録すると、ホームからワンタップで記録できます。"
            actionLabel="プリセットを追加"
            onAction={() => setTarget('new')}
          />
        )}

        {presets.map((preset) => (
          <SwipeToDeleteRow
            key={preset.id}
            onDelete={() => void handleDelete(preset)}
            accessibilityLabel={`${preset.label} を削除`}
          >
            <Pressable
              onPress={() => setTarget(preset)}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`${preset.label} を編集`}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {preset.label}
                </Text>
                <Text style={styles.rowMeta}>
                  {CATEGORY_LABELS[preset.category]}
                  {preset.drinkType !== null && ` ・ ${DRINK_TYPE_LABELS[preset.drinkType]}`}
                </Text>
              </View>

              <Text style={styles.rowAmount}>¥{formatYen(preset.amount)}</Text>
            </Pressable>
          </SwipeToDeleteRow>
        ))}

        {presets.length > 0 && <Text style={styles.hint}>左にスワイプすると削除できます</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PresetForm({
  preset,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  preset: Preset | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: PresetInput) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(preset?.label ?? '');
  const [amount, setAmount] = useState(preset?.amount ?? 0);
  const [category, setCategory] = useState<Category | null>(preset?.category ?? null);
  const [drinkType, setDrinkType] = useState<DrinkType | null>(preset?.drinkType ?? null);

  const canSubmit = label.trim().length > 0 && amount > 0 && category !== null && !submitting;

  return (
    <View style={styles.form}>
      <Text style={styles.formHeading}>
        {preset === null ? '新しいプリセット' : 'プリセットを編集'}
      </Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>ラベル</Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="缶ビール 500ml"
          placeholderTextColor="#A1A1AA"
          autoFocus
          style={styles.textInput}
          accessibilityLabel="ラベル"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>金額</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amountSymbol}>¥</Text>
          <TextInput
            value={amount === 0 ? '' : formatYen(amount)}
            onChangeText={(text) => setAmount(parseAmountDigits(text))}
            placeholder="0"
            placeholderTextColor="#A1A1AA"
            keyboardType="number-pad"
            inputMode="numeric"
            style={[styles.textInput, styles.amountInput]}
            accessibilityLabel="金額"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>カテゴリ</Text>
        <SegmentedControl
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
          label="カテゴリ"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>酒種（任意）</Text>
        <SegmentedControl
          options={DRINK_TYPE_OPTIONS}
          value={drinkType}
          // 選択済みのものをもう一度押したら解除できるようにする（任意項目のため）
          onChange={(next) => setDrinkType((current) => (current === next ? null : next))}
          label="酒種"
        />
      </View>

      {error !== null && <Text style={styles.error}>{error}</Text>}

      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.cancelButton} accessibilityRole="button">
          <Text style={styles.cancelLabel}>キャンセル</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (category === null) {
              return;
            }

            onSubmit({
              label: label.trim(),
              amount,
              category,
              drinkType,
              // 編集時は並び位置を保つ
              sortOrder: preset?.sortOrder,
            });
          }}
          disabled={!canSubmit}
          style={[styles.saveButton, !canSubmit && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
        >
          <Text style={styles.saveLabel}>{submitting ? '保存中' : '保存'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  lead: { fontSize: 13, lineHeight: 20, color: '#71717A' },
  addButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4D4D8',
  },
  addLabel: { fontSize: 15, fontWeight: '600', color: '#1D4ED8' },
  form: {
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    backgroundColor: '#FAFAFA',
  },
  formHeading: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, color: '#52525B' },
  textInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    fontSize: 15,
    color: '#18181B',
    backgroundColor: '#FFFFFF',
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountSymbol: { fontSize: 18, color: '#52525B' },
  amountInput: { flex: 1 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelLabel: { fontSize: 15, color: '#52525B' },
  saveButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#1D4ED8',
  },
  saveButtonDisabled: { backgroundColor: '#A1A1AA' },
  saveLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  error: { fontSize: 13, color: '#B91C1C' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  rowText: { flexShrink: 1, gap: 2 },
  rowLabel: { fontSize: 15, color: '#18181B' },
  rowMeta: { fontSize: 12, color: '#71717A' },
  rowAmount: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  hint: { fontSize: 12, color: '#A1A1AA', textAlign: 'center' },
});
