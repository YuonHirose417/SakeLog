import { useState } from 'react';

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { CategoryBreakdownCard } from '@/features/analytics/CategoryBreakdownCard';
import { CompanionRankingCard } from '@/features/analytics/CompanionRankingCard';
import { HomeOutRatioCard } from '@/features/analytics/HomeOutRatioCard';
import { MonthlySummaryCard } from '@/features/analytics/MonthlySummaryCard';
import { MonthlyTrendCard } from '@/features/analytics/MonthlyTrendCard';
import { YearlySummaryCard } from '@/features/analytics/YearlySummaryCard';
import { useCompanionRanking } from '@/features/analytics/use-companion-ranking';
import { useCompanionRankingControls } from '@/features/analytics/use-companion-ranking-controls';
import { useMonthlyAnalytics } from '@/features/analytics/use-monthly-analytics';
import { useYearlyAnalytics } from '@/features/analytics/use-yearly-analytics';
import { ProLockCard } from '@/features/billing/ProLockCard';

import { SegmentedControl } from '@/components/SegmentedControl';

import { useIsPro } from '@/store/use-app-store';

import { shiftMonth, shiftYear, toMonthKey, toYearKey } from '@/lib/datetime';
import type { Option } from '@/lib/labels';

type AnalyticsTab = 'month' | 'year';

const TAB_OPTIONS: readonly Option<AnalyticsTab>[] = [
  { value: 'month', label: '月次' },
  { value: 'year', label: '年次' },
];

export default function AnalyticsScreen() {
  const [tab, setTab] = useState<AnalyticsTab>('month');
  const isPro = useIsPro();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} label="集計の期間" />

      {tab === 'month' ? (
        <MonthlyTab />
      ) : isPro ? (
        <YearlyTab />
      ) : (
        // 年次サマリーは Pro 限定（要件定義 §5.2）。
        // タブの切り替え自体は妨げず、中身をロック表示にして内容を伝える
        <ProLockCard
          title="年次サマリーは Pro 限定です"
          description="1年間の総支出、月別の推移、最も回数の多かった相手・最も高くついた相手が見られます。"
        />
      )}
    </ScrollView>
  );
}

function MonthlyTab() {
  const currentMonth = toMonthKey(new Date());
  const [month, setMonth] = useState(currentMonth);
  const { sortKey, minVisitsOnly, setSortKey, setMinVisitsOnly, averageSortLocked } =
    useCompanionRankingControls();

  const { summary, breakdown, loading } = useMonthlyAnalytics(month);
  // 無料版の「上位3人まで」は hook の中で切り分ける（lockedCount に隠した人数が返る）
  const {
    stats,
    lockedCount,
    loading: rankingLoading,
  } = useCompanionRanking({ type: 'month', key: month }, sortKey, minVisitsOnly);

  return (
    <>
      <PeriodHeader
        label={formatMonth(month)}
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        canGoNext={month < currentMonth}
      />

      {loading && summary === null ? (
        <ActivityIndicator style={styles.loading} />
      ) : summary === null || summary.recordCount === 0 ? (
        <Text style={styles.empty}>この月の記録はまだありません。</Text>
      ) : (
        <>
          <MonthlySummaryCard summary={summary} />
          <CategoryBreakdownCard breakdown={breakdown} />
          <HomeOutRatioCard summary={summary} />
        </>
      )}

      <CompanionRankingCard
        title="誰と飲んだか"
        stats={stats}
        loading={rankingLoading}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        minVisitsOnly={minVisitsOnly}
        onMinVisitsOnlyChange={setMinVisitsOnly}
        lockedCount={lockedCount}
        averageSortLocked={averageSortLocked}
        onLockedPress={() => router.push('/paywall')}
      />
    </>
  );
}

function YearlyTab() {
  const currentYear = toYearKey(new Date());
  const [year, setYear] = useState(currentYear);
  const { sortKey, minVisitsOnly, setSortKey, setMinVisitsOnly, averageSortLocked } =
    useCompanionRankingControls();

  const { summary, trend, loading } = useYearlyAnalytics(year);
  // 無料版の「上位3人まで」は hook の中で切り分ける（lockedCount に隠した人数が返る）
  const {
    stats,
    lockedCount,
    loading: rankingLoading,
  } = useCompanionRanking({ type: 'year', key: year }, sortKey, minVisitsOnly);

  return (
    <>
      <PeriodHeader
        label={`${year}年`}
        onPrevious={() => setYear(shiftYear(year, -1))}
        onNext={() => setYear(shiftYear(year, 1))}
        canGoNext={year < currentYear}
      />

      {loading && summary === null ? (
        <ActivityIndicator style={styles.loading} />
      ) : summary === null || summary.recordCount === 0 ? (
        <Text style={styles.empty}>この年の記録はまだありません。</Text>
      ) : (
        <>
          <YearlySummaryCard summary={summary} />
          <MonthlyTrendCard trend={trend} />
        </>
      )}

      <CompanionRankingCard
        title="誰と飲んだか（年間）"
        stats={stats}
        loading={rankingLoading}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        minVisitsOnly={minVisitsOnly}
        onMinVisitsOnlyChange={setMinVisitsOnly}
        lockedCount={lockedCount}
        averageSortLocked={averageSortLocked}
        onLockedPress={() => router.push('/paywall')}
      />
    </>
  );
}

/** 期間の前後移動。翌月・翌年には進めない。 */
function PeriodHeader({
  label,
  onPrevious,
  onNext,
  canGoNext,
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}) {
  return (
    <View style={styles.periodHeader}>
      <Pressable
        onPress={onPrevious}
        style={styles.periodButton}
        accessibilityRole="button"
        accessibilityLabel="前の期間"
      >
        <Ionicons name="chevron-back" size={20} color="#3F3F46" />
      </Pressable>

      <Text style={styles.periodLabel}>{label}</Text>

      <Pressable
        onPress={() => canGoNext && onNext()}
        disabled={!canGoNext}
        style={styles.periodButton}
        accessibilityRole="button"
        accessibilityLabel="次の期間"
        accessibilityState={{ disabled: !canGoNext }}
      >
        <Ionicons name="chevron-forward" size={20} color={canGoNext ? '#3F3F46' : '#D4D4D8'} />
      </Pressable>
    </View>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  periodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  periodLabel: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  loading: { marginVertical: 24 },
  empty: { fontSize: 14, color: '#71717A' },
});
