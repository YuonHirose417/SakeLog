import { useEffect, useState } from 'react';

import { findMonthlyTrendByYear, findYearlySummary } from '@/repositories/analytics-repository';

import { buildMonthlyTrend } from '@/features/analytics/build-monthly-trend';
import type { MonthlyTrend } from '@/features/analytics/build-monthly-trend';

import { useDataRevision } from '@/store/use-app-store';

import { toMonthKey } from '@/lib/datetime';

import type { YearlySummary } from '@/types/analytics';

type UseYearlyAnalyticsResult = {
  summary: YearlySummary | null;
  trend: MonthlyTrend;
  loading: boolean;
  error: string | null;
};

const EMPTY_TREND: MonthlyTrend = { points: [], maxAmount: 0 };

/**
 * 年次サマリーと月別推移（要件定義 §4.4）。
 * 集計は SQL 側で完結させ、結果はキャッシュしない（CLAUDE.md §5 / §6）。
 */
export function useYearlyAnalytics(year: string): UseYearlyAnalyticsResult {
  const dataRevision = useDataRevision();
  const [summary, setSummary] = useState<YearlySummary | null>(null);
  const [trend, setTrend] = useState<MonthlyTrend>(EMPTY_TREND);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [yearlySummary, points] = await Promise.all([
          findYearlySummary(year),
          findMonthlyTrendByYear(year),
        ]);

        if (cancelled) {
          return;
        }

        setSummary(yearlySummary);
        setTrend(buildMonthlyTrend(year, points, toMonthKey(new Date())));
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
  }, [year, dataRevision]);

  return { summary, trend, loading, error };
}
