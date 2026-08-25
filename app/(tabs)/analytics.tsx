import { useState } from 'react';

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import { CategoryBreakdownCard } from '@/features/analytics/CategoryBreakdownCard';
import { CompanionRankingCard } from '@/features/analytics/CompanionRankingCard';
import { HomeOutRatioCard } from '@/features/analytics/HomeOutRatioCard';
import { MonthlySummaryCard } from '@/features/analytics/MonthlySummaryCard';
import { useCompanionRanking } from '@/features/analytics/use-companion-ranking';
import { useMonthlyAnalytics } from '@/features/analytics/use-monthly-analytics';

import { shiftMonth, toMonthKey } from '@/lib/datetime';

import type { CompanionSortKey } from '@/types/analytics';

export default function AnalyticsScreen() {
  const currentMonth = toMonthKey(new Date());
  const [month, setMonth] = useState(currentMonth);

  const [sortKey, setSortKey] = useState<CompanionSortKey>('total');
  const [minVisitsOnly, setMinVisitsOnly] = useState(false);
  // ユーザーがフィルタを手で触ったかどうか。触った後はソート切替で上書きしない。
  const [filterTouched, setFilterTouched] = useState(false);

  const { summary, breakdown, loading } = useMonthlyAnalytics(month);
  const { stats, loading: rankingLoading } = useCompanionRanking(month, sortKey, minVisitsOnly);

  const canGoNext = month < currentMonth;

  /**
   * 平均額ソートでは「3回以上」を既定 ON にする（要件定義 §4.4）。
   * ただし利用者が自分でトグルした後は、その意思を尊重して自動で上書きしない。
   */
  const handleSortKeyChange = (next: CompanionSortKey) => {
    setSortKey(next);

    if (!filterTouched) {
      setMinVisitsOnly(next === 'average');
    }
  };

  const handleMinVisitsOnlyChange = (next: boolean) => {
    setMinVisitsOnly(next);
    setFilterTouched(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => setMonth(shiftMonth(month, -1))}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel="前の月"
        >
          <Ionicons name="chevron-back" size={20} color="#3F3F46" />
        </Pressable>

        <Text style={styles.monthLabel}>{formatMonth(month)}</Text>

        <Pressable
          onPress={() => canGoNext && setMonth(shiftMonth(month, 1))}
          disabled={!canGoNext}
          style={styles.monthButton}
          accessibilityRole="button"
          accessibilityLabel="次の月"
          accessibilityState={{ disabled: !canGoNext }}
        >
          <Ionicons name="chevron-forward" size={20} color={canGoNext ? '#3F3F46' : '#D4D4D8'} />
        </Pressable>
      </View>

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
        stats={stats}
        loading={rankingLoading}
        sortKey={sortKey}
        onSortKeyChange={handleSortKeyChange}
        minVisitsOnly={minVisitsOnly}
        onMinVisitsOnlyChange={handleMinVisitsOnlyChange}
      />
    </ScrollView>
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
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '600', color: '#18181B' },
  loading: { marginVertical: 24 },
  empty: { fontSize: 14, color: '#71717A' },
});
