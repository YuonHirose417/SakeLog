import { useState } from 'react';

import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { CompanionInput } from '@/features/companions/CompanionInput';

import { SegmentedControl } from '@/components/SegmentedControl';

import { formatYen, parseAmountDigits } from '@/lib/currency';
import { localIsoDaysAgo, toShortDateLabel } from '@/lib/datetime';
import { CATEGORY_OPTIONS, DRINK_TYPE_OPTIONS } from '@/lib/labels';

import type { Category, DrinkType, SpendingRecordInput } from '@/types/record';

type DateChoice = {
  /** spent_at に入れる値（ローカル時刻の ISO8601） */
  value: string;
  label: string;
};

export type RecordFormValues = {
  amount: number;
  category: Category | null;
  drinkType: DrinkType | null;
  isSolo: boolean;
  memo: string;
  spentAt: string;
  companionNames: string[];
};

type RecordFormProps = {
  initialValues?: Partial<RecordFormValues>;
  onSubmit: (input: SpendingRecordInput) => void;
  submitting: boolean;
  error: string | null;
  /** 画面下部に置く追加操作（編集画面の削除ボタンなど）。 */
  footer?: React.ReactNode;
};

/**
 * 記録の入力フォーム。新規作成と編集で共用する。
 *
 * 日付の選択肢は「今日 / 昨日 / 一昨日」に加えて、
 * 編集時は**その記録自身の日付**を先頭に置く。触らなければ元の日付が保たれる。
 * 任意の日付への変更はデートピッカー導入時に対応する。
 */
export function RecordForm({
  initialValues,
  onSubmit,
  submitting,
  error,
  footer,
}: RecordFormProps) {
  const dateChoices = buildDateChoices(initialValues?.spentAt);

  const [amount, setAmount] = useState(initialValues?.amount ?? 0);
  const [category, setCategory] = useState<Category | null>(initialValues?.category ?? null);
  const [spentAt, setSpentAt] = useState(initialValues?.spentAt ?? dateChoices[0].value);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [drinkType, setDrinkType] = useState<DrinkType | null>(initialValues?.drinkType ?? null);
  const [isSolo, setIsSolo] = useState(initialValues?.isSolo ?? false);
  const [memo, setMemo] = useState(initialValues?.memo ?? '');
  const [companionNames, setCompanionNames] = useState<string[]>(
    initialValues?.companionNames ?? [],
  );

  const canSubmit = amount > 0 && category !== null && !submitting;

  /**
   * 「一人で飲んだ」と同行者は相互排他にする。
   * リポジトリ層は is_solo のとき同行者を保存しないので、
   * UI 側で先に打ち消しておかないと入力した名前が黙って消えることになる。
   */
  const handleSoloChange = (next: boolean) => {
    setIsSolo(next);

    if (next) {
      setCompanionNames([]);
    }
  };

  const handleCompanionsChange = (names: string[]) => {
    setCompanionNames(names);

    if (names.length > 0) {
      setIsSolo(false);
    }
  };

  const handleSubmit = () => {
    if (category === null || amount <= 0) {
      return;
    }

    onSubmit({
      amount,
      category,
      drinkType,
      isSolo,
      memo: memo.trim().length === 0 ? null : memo.trim(),
      spentAt,
      companionNames,
    });
  };

  // 外飲みのときは常に見せる。誰かを選んでいる場合も、折りたたみに隠れないよう常に見せる。
  const showCompanionInline = category === 'bar' || companionNames.length > 0;

  // 「誰と」と「一人で飲んだ」は相互排他なので、同じ視界に並べて置く。
  // 配置が任意項目の中に移るときも、この2つは一緒に移動する。
  const companionField = (
    <View style={styles.field}>
      <View style={styles.fieldHeaderRow}>
        <Text style={styles.fieldLabel}>誰と</Text>

        <View style={styles.soloToggle}>
          <Text style={styles.fieldLabel}>一人で飲んだ</Text>
          <Switch
            value={isSolo}
            onValueChange={handleSoloChange}
            accessibilityLabel="一人で飲んだ"
          />
        </View>
      </View>

      <CompanionInput value={companionNames} onChange={handleCompanionsChange} disabled={isSolo} />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

      {showCompanionInline && companionField}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>日付</Text>
        <View style={styles.dateRow}>
          {dateChoices.map((choice) => {
            const selected = choice.value === spentAt;

            return (
              <Pressable
                key={choice.value}
                onPress={() => setSpentAt(choice.value)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {choice.label}
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
          {optionalOpen ? '任意項目を閉じる' : '任意項目を追加（酒種・メモ）'}
        </Text>
      </Pressable>

      {optionalOpen && (
        <View style={styles.optionalSection}>
          {!showCompanionInline && companionField}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>酒種</Text>
            <SegmentedControl
              options={DRINK_TYPE_OPTIONS}
              value={drinkType}
              onChange={setDrinkType}
              label="酒種"
            />
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

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
      >
        <Text style={styles.submitLabel}>{submitting ? '保存中' : '保存'}</Text>
      </Pressable>

      {footer}
    </ScrollView>
  );
}

/**
 * 日付チップの選択肢を作る。
 * 編集時、対象の記録の日付が「今日 / 昨日 / 一昨日」に該当しない場合は先頭に足す。
 */
function buildDateChoices(currentSpentAt: string | undefined): [DateChoice, ...DateChoice[]] {
  const base: [DateChoice, ...DateChoice[]] = [
    { value: localIsoDaysAgo(0), label: '今日' },
    { value: localIsoDaysAgo(1), label: '昨日' },
    { value: localIsoDaysAgo(2), label: '一昨日' },
  ];

  if (currentSpentAt === undefined) {
    return base;
  }

  const sameDay = base.find((choice) => choice.value.slice(0, 10) === currentSpentAt.slice(0, 10));

  if (sameDay !== undefined) {
    // 同じ日ならチップの値を記録自身の値に差し替えて、時刻まで保つ
    return base.map((choice) =>
      choice === sameDay ? { value: currentSpentAt, label: choice.label } : choice,
    ) as [DateChoice, ...DateChoice[]];
  }

  return [{ value: currentSpentAt, label: toShortDateLabel(currentSpentAt) }, ...base];
}

const styles = StyleSheet.create({
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
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  fieldHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soloToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1D4ED8',
  },
  submitButtonDisabled: { backgroundColor: '#A1A1AA' },
  submitLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
