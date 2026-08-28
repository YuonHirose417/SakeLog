import { useEffect, useState } from 'react';

import { findDailyTotals, findMonthlySummary } from '@/repositories/analytics-repository';
import { findEffectiveBudget } from '@/repositories/budget-repository';

import { dailyBudgetOf, daysInMonth } from '@/features/budget/budget-math';
import { buildCalendarMonth } from '@/features/records/build-calendar-month';
import type { CalendarMonth } from '@/features/records/build-calendar-month';

import { useDataRevision } from '@/store/use-app-store';

import { toLocalIso } from '@/lib/datetime';

import type { MonthlySummary } from '@/types/analytics';

type UseCalendarMonthResult = {
  calendar: CalendarMonth | null;
  summary: MonthlySummary | null;
  /** その月の日割り予算。未設定なら null（濃淡は最大額基準になる）。 */
  dailyBudget: number | null;
  loading: boolean;
  error: string | null;
};

/**
 * カレンダー1ヶ月ぶんのデータ。
 *
 * 日別合計は既存の findDailyTotals（SQL 側で集約）をそのまま使う。
 * 濃淡の基準にする日割り予算は、その月に適用される予算から求める。
 */
export function useCalendarMonth(month: string): UseCalendarMonthResult {
  const dataRevision = useDataRevision();
  const [calendar, setCalendar] = useState<CalendarMonth | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [dailyBudget, setDailyBudget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const lastDay = `${daysInMonth(month)}`.padStart(2, '0');

        const [dailyTotals, monthlySummary, budget] = await Promise.all([
          findDailyTotals(`${month}-01`, `${month}-${lastDay}`),
          findMonthlySummary(month),
          findEffectiveBudget(month),
        ]);

        if (cancelled) {
          return;
        }

        const perDay = budget === null ? null : dailyBudgetOf(budget.amount, month);

        setCalendar(
          buildCalendarMonth(month, dailyTotals, {
            dailyBudget: perDay,
            today: toLocalIso(new Date()).slice(0, 10),
          }),
        );
        setSummary(monthlySummary);
        setDailyBudget(perDay);
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

  return { calendar, summary, dailyBudget, loading, error };
}
