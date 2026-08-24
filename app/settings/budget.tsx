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

import { Stack, router } from 'expo-router';

import { useBudgetSettings } from '@/features/budget/use-budget-settings';

import { useToast } from '@/components/ToastProvider';

import { formatYen, parseAmountDigits } from '@/lib/currency';

export default function BudgetSettingsScreen() {
  const { month, currentAmount, inheritedAmount, loading, saving, error, save } =
    useBudgetSettings();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<number | null>(null);

  // 読み込み前は draft が null。読み込み後は設定値を初期値として扱う。
  const amount = draft ?? currentAmount ?? 0;
  const canSave = amount > 0 && !saving && !loading;

  const handleSave = async () => {
    const saved = await save(amount);

    if (!saved) {
      return;
    }

    router.back();
    showToast({ message: '予算を設定しました', durationMs: 2500 });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: true, title: '月予算の設定' }} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.monthLabel}>{formatMonth(month)}の予算</Text>

        <View style={styles.amountRow}>
          <Text style={styles.amountSymbol}>¥</Text>
          <TextInput
            value={amount === 0 ? '' : formatYen(amount)}
            onChangeText={(text) => setDraft(parseAmountDigits(text))}
            placeholder={inheritedAmount === null ? '0' : formatYen(inheritedAmount)}
            placeholderTextColor="#A1A1AA"
            keyboardType="number-pad"
            inputMode="numeric"
            autoFocus
            style={styles.amountInput}
            accessibilityLabel="月予算"
          />
        </View>

        {inheritedAmount !== null && (
          <Text style={styles.note}>
            未設定の月は前月の設定（¥{formatYen(inheritedAmount)}）が引き継がれます。
          </Text>
        )}

        <Text style={styles.note}>
          月ごとに違う予算を設定する機能は Pro 版で提供予定です。ここでは今月の予算を設定します。
        </Text>

        {error !== null && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
        >
          <Text style={styles.saveLabel}>{saving ? '保存中' : '保存'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** '2026-08' → '2026年8月' */
function formatMonth(month: string): string {
  const [year, monthPart] = month.split('-');

  if (year === undefined || monthPart === undefined) {
    return month;
  }

  return `${year}年${Number(monthPart)}月`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, gap: 16 },
  monthLabel: { fontSize: 14, color: '#52525B' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountSymbol: { fontSize: 24, color: '#52525B' },
  amountInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 36,
    fontWeight: '600',
    color: '#18181B',
  },
  note: { fontSize: 13, lineHeight: 20, color: '#71717A' },
  error: { fontSize: 13, color: '#B91C1C' },
  saveButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1D4ED8',
  },
  saveButtonDisabled: { backgroundColor: '#A1A1AA' },
  saveLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
