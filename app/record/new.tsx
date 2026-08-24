import { useState } from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateRecord } from '@/features/records/use-create-record';

import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/ToastProvider';

import { formatYen, parseAmountDigits } from '@/lib/currency';
import { localIsoDaysAgo } from '@/lib/datetime';
import { CATEGORY_OPTIONS, DRINK_TYPE_OPTIONS } from '@/lib/labels';

import type { Category, DrinkType } from '@/types/record';

const DATE_OPTIONS: readonly { daysAgo: number; label: string }[] = [
  { daysAgo: 0, label: '今日' },
  { daysAgo: 1, label: '昨日' },
  { daysAgo: 2, label: '一昨日' },
];

export default function NewRecordScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { save, undo, saving, error } = useCreateRecord();

  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [daysAgo, setDaysAgo] = useState(0);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [drinkType, setDrinkType] = useState<DrinkType | null>(null);
  const [isSolo, setIsSolo] = useState(false);
  const [memo, setMemo] = useState('');

  const canSave = amount > 0 && category !== null && !saving;

  const handleSave = async () => {
    if (category === null || amount <= 0) {
      return;
    }

    const createdId = await save({
      amount,
      category,
      drinkType,
      isSolo,
      memo: memo.trim().length === 0 ? null : memo.trim(),
      spentAt: localIsoDaysAgo(daysAgo),
    });

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

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={[styles.headerSave, !canSave && styles.headerSaveDisabled]}>
            {saving ? '保存中' : '保存'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.amountRow}>
          <Text style={styles.amountSymbol}>¥</Text>
          <TextInput
            value={amount === 0 ? '' : formatYen(amount)}
            onChangeText={(text) => setAmount(parseAmountDigits(text))}
            placeholder="0"
            placeholderTextColor="#A1A1AA"
            keyboardType="number-pad"
            inputMode="numeric"
            autoFocus
            style={styles.amountInput}
            accessibilityLabel="金額"
          />
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
          <Text style={styles.fieldLabel}>日付</Text>
          <View style={styles.dateRow}>
            {DATE_OPTIONS.map((option) => {
              const selected = option.daysAgo === daysAgo;

              return (
                <Pressable
                  key={option.daysAgo}
                  onPress={() => setDaysAgo(option.daysAgo)}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => setOptionalOpen((open) => !open)}
          style={styles.disclosure}
          accessibilityRole="button"
          accessibilityState={{ expanded: optionalOpen }}
        >
          <Text style={styles.disclosureText}>
            {optionalOpen ? '任意項目を閉じる' : '任意項目を追加（酒種・メモなど）'}
          </Text>
        </Pressable>

        {optionalOpen && (
          <View style={styles.optionalSection}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>酒種</Text>
              <SegmentedControl
                options={DRINK_TYPE_OPTIONS}
                value={drinkType}
                onChange={setDrinkType}
                label="酒種"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>一人で飲んだ</Text>
              <Switch value={isSolo} onValueChange={setIsSolo} accessibilityLabel="一人で飲んだ" />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>メモ</Text>
              <TextInput
                value={memo}
                onChangeText={setMemo}
                placeholder="任意"
                placeholderTextColor="#A1A1AA"
                style={styles.memoInput}
                accessibilityLabel="メモ"
              />
            </View>
          </View>
        )}

        {error !== null && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
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
  headerButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  headerCancel: { fontSize: 15, color: '#52525B' },
  headerSave: { fontSize: 15, fontWeight: '600', color: '#1D4ED8' },
  headerSaveDisabled: { color: '#A1A1AA' },
  content: { padding: 16, gap: 24 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  amountSymbol: { fontSize: 28, color: '#52525B' },
  amountInput: {
    minWidth: 160,
    paddingVertical: 8,
    fontSize: 40,
    fontWeight: '600',
    color: '#18181B',
    textAlign: 'center',
  },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, color: '#52525B' },
  dateRow: { flexDirection: 'row', gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4D4D8',
  },
  chipSelected: { borderColor: '#1D4ED8', backgroundColor: '#E8EFFD' },
  chipText: { fontSize: 14, color: '#3F3F46' },
  chipTextSelected: { color: '#1D4ED8', fontWeight: '600' },
  disclosure: { minHeight: 44, justifyContent: 'center' },
  disclosureText: { fontSize: 14, color: '#1D4ED8' },
  optionalSection: { gap: 24 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memoInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    fontSize: 15,
    color: '#18181B',
  },
  error: { fontSize: 13, color: '#B91C1C' },
});
