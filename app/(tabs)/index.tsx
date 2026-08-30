import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router } from 'expo-router';

import { useBudgetOverview } from '@/features/budget/use-budget-overview';
import { RecentRecordsSection } from '@/features/records/RecentRecordsSection';
import { useCreateRecord } from '@/features/records/use-create-record';
import { usePresets } from '@/features/records/use-presets';
import type { BudgetOverview } from '@/features/budget/use-budget-overview';

import { useToast } from '@/components/ToastProvider';

import { formatYen } from '@/lib/currency';
import { toLocalIso } from '@/lib/datetime';

import type { Preset } from '@/types/preset';

export default function HomeScreen() {
  const { overview, loading } = useBudgetOverview();
  const { presets } = usePresets();
  const { save, undo } = useCreateRecord();
  const { showToast } = useToast();

  const recordPreset = async (preset: Preset) => {
    const createdId = await save({
      amount: preset.amount,
      category: preset.category,
      drinkType: preset.drinkType,
      spentAt: toLocalIso(new Date()),
    });

    if (createdId === null) {
      return;
    }

    showToast({
      message: `${preset.label} を記録しました`,
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>今月の支出</Text>
        {loading && overview === null ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <Text style={styles.total}>¥{formatYen(overview?.totalAmount ?? 0)}</Text>
        )}

        {overview !== null && <BudgetPanel overview={overview} />}

        {presets.length > 0 && (
          <View style={styles.presetSection}>
            <Text style={styles.sectionLabel}>よく買う酒</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetRow}
            >
              {presets.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => void recordPreset(preset)}
                  style={styles.presetButton}
                  accessibilityRole="button"
                  accessibilityLabel={`${preset.label} ${preset.amount}円を記録`}
                >
                  <Text style={styles.presetLabel} numberOfLines={1}>
                    {preset.label}
                  </Text>
                  <Text style={styles.presetAmount}>¥{formatYen(preset.amount)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <RecentRecordsSection />
      </ScrollView>

      <Link href="/record/new" asChild>
        <Pressable style={styles.fab} accessibilityRole="button" accessibilityLabel="記録を追加">
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </Link>
    </View>
  );
}

/**
 * 予算まわりの表示。
 * 予算超過でも咎める言い回しはせず、金額と差分だけを淡々と示す（要件定義 §4.3）。
 */
function BudgetPanel({ overview }: { overview: BudgetOverview }) {
  const {
    budgetAmount,
    remainingAmount,
    remainingDays,
    paceForecast,
    forecastDiff,
    monthOverMonthDiff,
    streakDays,
  } = overview;

  if (budgetAmount === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardText}>月予算はまだ設定されていません。</Text>
        <Pressable
          onPress={() => router.push('/settings/budget')}
          style={styles.linkButton}
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>予算を設定する</Text>
        </Pressable>
      </View>
    );
  }

  const overBudget = remainingAmount !== null && remainingAmount < 0;

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeading}>予算 ¥{formatYen(budgetAmount)}</Text>

      <Text style={[styles.cardText, overBudget && styles.caution]}>
        {overBudget
          ? `予算比 +¥${formatYen(Math.abs(remainingAmount ?? 0))} ／ 残り${remainingDays}日`
          : `残り ¥${formatYen(remainingAmount ?? 0)} ／ 残り${remainingDays}日`}
      </Text>

      {paceForecast === null ? (
        <Text style={styles.cardMuted}>ペース予測は数日分の記録がたまってから表示されます</Text>
      ) : (
        <Text style={[styles.cardText, (forecastDiff ?? 0) > 0 && styles.caution]}>
          {`このペースだと月末 ¥${formatYen(paceForecast)}`}
          {forecastDiff !== null && `（予算比 ${formatDiff(forecastDiff)}）`}
        </Text>
      )}

      {monthOverMonthDiff !== null && (
        <Text style={styles.cardMuted}>{formatMonthOverMonth(monthOverMonthDiff)}</Text>
      )}

      {streakDays !== null && streakDays > 0 && (
        <Text style={styles.streak}>予算内 {streakDays}日連続</Text>
      )}
    </View>
  );
}

/** 差分を符号付きで表す。'+¥7,000' / '-¥3,000' */
function formatDiff(diff: number): string {
  const sign = diff > 0 ? '+' : '-';

  return `${sign}¥${formatYen(Math.abs(diff))}`;
}

/** 前月同期比。事実だけを述べ、評価や励ましの言葉は付けない。 */
function formatMonthOverMonth(diff: number): string {
  if (diff === 0) {
    return '先月の同じ時期と同じ額です';
  }

  const amount = formatYen(Math.abs(diff));

  return diff < 0
    ? `先月の同じ時期より ¥${amount} 少ない支出です`
    : `先月の同じ時期より ¥${amount} 多い支出です`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 96, gap: 16 },
  sectionLabel: { fontSize: 13, color: '#52525B' },
  loading: { alignSelf: 'flex-start' },
  total: { fontSize: 44, fontWeight: '700', color: '#18181B' },
  card: {
    gap: 6,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
  },
  cardHeading: { fontSize: 15, fontWeight: '600', color: '#18181B' },
  cardText: { fontSize: 14, color: '#3F3F46' },
  cardMuted: { fontSize: 13, color: '#71717A' },
  caution: { color: '#B45309' },
  streak: { fontSize: 14, fontWeight: '600', color: '#15803D' },
  linkButton: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 14, fontWeight: '600', color: '#1D4ED8' },
  presetSection: { gap: 8 },
  presetRow: { gap: 8, paddingRight: 8 },
  presetButton: {
    minWidth: 120,
    minHeight: 60,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4D4D8',
  },
  presetLabel: { fontSize: 13, color: '#3F3F46' },
  presetAmount: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#1D4ED8',
  },
});
