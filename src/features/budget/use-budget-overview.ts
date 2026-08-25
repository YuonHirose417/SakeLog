import { useCallback, useEffect, useState } from 'react';

import {
  findDailyTotals,
  findFirstRecordDate,
  findMonthToDateTotal,
  findMonthlySummary,
} from '@/repositories/analytics-repository';
import { findEffectiveBudget } from '@/repositories/budget-repository';

import {
  calcPaceForecast,
  calcStreak,
  dayOfMonthOf,
  elapsedDaysOf,
  remainingDaysOf,
  streakRangeStart,
} from '@/features/budget/budget-math';

import { useDataRevision } from '@/store/use-app-store';

import { shiftMonth, toLocalIso } from '@/lib/datetime';

export type BudgetOverview = {
  /** 'YYYY-MM' */
  month: string;
  totalAmount: number;
  recordCount: number;
  /** 適用される月予算。一度も設定されていなければ null。 */
  budgetAmount: number | null;
  /** 予算 - 支出。予算未設定なら null。超過時は負になる。 */
  remainingAmount: number | null;
  remainingDays: number;
  /** 経過3日未満は null（振れ幅が大きいため出さない）。 */
  paceForecast: number | null;
  /** 予測 - 予算。どちらかが無ければ null。 */
  forecastDiff: number | null;
  /** 前月の同じ日までの支出との差（今月 - 前月）。負なら今月の方が少ない。 */
  monthOverMonthDiff: number | null;
  /** 連続で日割り予算内だった日数。判定できなければ null。 */
  streakDays: number | null;
};

type UseBudgetOverviewResult = {
  overview: BudgetOverview | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * ホームに出す予算まわりの数字をまとめて返す（要件定義 §4.3 / §6.1）。
 *
 * 合計は SQL 側で算出し、結果はストアにキャッシュしない（CLAUDE.md §5 / §6）。
 * 再取得トリガー（dataRevision）が進むたびに引き直す。
 */
export function useBudgetOverview(): UseBudgetOverviewResult {
  const dataRevision = useDataRevision();
  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualRevision, setManualRevision] = useState(0);

  const reload = useCallback(() => setManualRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const today = toLocalIso(new Date()).slice(0, 10);
        const month = today.slice(0, 7);
        const previousMonth = shiftMonth(month, -1);
        const elapsedDays = elapsedDaysOf(today);

        const [summary, budget, previousMonthToDate, dailyTotals, firstRecordDate] =
          await Promise.all([
            findMonthlySummary(month),
            findEffectiveBudget(month),
            findMonthToDateTotal(previousMonth, dayOfMonthOf(today)),
            findDailyTotals(streakRangeStart(today), today),
            findFirstRecordDate(),
          ]);

        // ストリークは月をまたぐため、遡る範囲の各月の予算を引いておく
        const months = new Set(dailyTotals.map((entry) => entry.date.slice(0, 7)));
        months.add(month);
        months.add(streakRangeStart(today).slice(0, 7));

        const budgetByMonth = new Map<string, number | null>();
        await Promise.all(
          [...months].map(async (target) => {
            const effective = await findEffectiveBudget(target);
            budgetByMonth.set(target, effective?.amount ?? null);
          }),
        );

        const paceForecast = calcPaceForecast({
          totalAmount: summary.totalAmount,
          elapsedDays,
          daysInMonth: elapsedDays + remainingDaysOf(today),
        });

        const streakDays = calcStreak({
          dailyTotals,
          monthlyBudgetOf: (target) => budgetByMonth.get(target) ?? null,
          firstRecordDate,
          today,
        });

        if (cancelled) {
          return;
        }

        setOverview({
          month,
          totalAmount: summary.totalAmount,
          recordCount: summary.recordCount,
          budgetAmount: budget?.amount ?? null,
          remainingAmount: budget === null ? null : budget.amount - summary.totalAmount,
          remainingDays: remainingDaysOf(today),
          paceForecast,
          forecastDiff:
            paceForecast === null || budget === null ? null : paceForecast - budget.amount,
          monthOverMonthDiff: summary.totalAmount - previousMonthToDate,
          streakDays,
        });
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
  }, [dataRevision, manualRevision]);

  return { overview, loading, error, reload };
}
