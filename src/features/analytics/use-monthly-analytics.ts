import { useEffect, useState } from 'react';

import { findCategoryBreakdown, findMonthlySummary } from '@/repositories/analytics-repository';

import { useDataRevision } from '@/store/use-app-store';

import type { CategoryBreakdown, MonthlySummary } from '@/types/analytics';

type UseMonthlyAnalyticsResult = {
  summary: MonthlySummary | null;
  breakdown: CategoryBreakdown[];
  loading: boolean;
  error: string | null;
};

/**
 * 対象月の月次サマリーとカテゴリ別内訳（要件定義 §4.4）。
 *
 * 合計は SQL 側で算出し、結果はキャッシュしない。
 * 月が変わったとき、および dataRevision が進んだときに引き直す（CLAUDE.md §5 / §6）。
 */
export function useMonthlyAnalytics(month: string): UseMonthlyAnalyticsResult {
  const dataRevision = useDataRevision();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [monthlySummary, categoryBreakdown] = await Promise.all([
          findMonthlySummary(month),
          findCategoryBreakdown(month),
        ]);

        if (cancelled) {
          return;
        }

        setSummary(monthlySummary);
        setBreakdown(categoryBreakdown);
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '読み込みに失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [month, dataRevision]);

  return { summary, breakdown, loading, error };
}
