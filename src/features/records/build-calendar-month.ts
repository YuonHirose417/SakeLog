import { daysInMonth } from '@/features/budget/budget-math';

import type { DailyTotal } from '@/types/analytics';

/**
 * カレンダーのグリッド組み立てと濃淡の計算。
 * 副作用のない純粋関数にして、単体で検証できるようにしている。
 */

/** 濃淡の段階。0 は記録なし。 */
export type CalendarIntensity = 0 | 1 | 2 | 3 | 4;

export type CalendarCell = {
  /** 'YYYY-MM-DD'。前後月ぶんの空白マスは null。 */
  date: string | null;
  /** 1〜31。空白マスは 0。 */
  day: number;
  totalAmount: number;
  intensity: CalendarIntensity;
  /** 今日より後の日。記録の導線を出さないために使う。 */
  isFuture: boolean;
};

export type CalendarMonth = {
  /** 週ごとの行。各行は必ず7セル。 */
  weeks: CalendarCell[][];
  /** その月の最大の日別合計。凡例に使う。 */
  maxAmount: number;
};

type BuildOptions = {
  /** その月の日割り予算。未設定なら null（月内最大額基準にフォールバックする）。 */
  dailyBudget: number | null;
  /** 今日 'YYYY-MM-DD'。 */
  today: string;
};

const EMPTY_CELL: CalendarCell = {
  date: null,
  day: 0,
  totalAmount: 0,
  intensity: 0,
  isFuture: false,
};

/**
 * 濃淡を決める。
 *
 * 日割り予算があるときはそれを基準にする（「使いすぎた日」が一目で分かる）。
 * 予算未設定の月は基準が無いので、月内の最大額に対する比率にフォールバックする。
 */
function toIntensity(
  amount: number,
  dailyBudget: number | null,
  maxAmount: number,
): CalendarIntensity {
  if (amount <= 0) {
    return 0;
  }

  if (dailyBudget !== null && dailyBudget > 0) {
    const ratio = amount / dailyBudget;

    if (ratio <= 0.5) return 1;
    if (ratio <= 1) return 2;
    if (ratio <= 2) return 3;
    return 4;
  }

  if (maxAmount <= 0) {
    return 1;
  }

  const ratio = amount / maxAmount;

  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/**
 * 月のカレンダーを組み立てる。
 *
 * 週の開始は日曜。1日の曜日ぶん先頭に空白を入れ、末尾も7の倍数まで空白で埋める
 * （結果として5〜6行になる）。
 */
export function buildCalendarMonth(
  month: string,
  dailyTotals: readonly DailyTotal[],
  { dailyBudget, today }: BuildOptions,
): CalendarMonth {
  const totalByDate = new Map(dailyTotals.map((entry) => [entry.date, entry.totalAmount]));
  const maxAmount = dailyTotals.reduce((max, entry) => Math.max(max, entry.totalAmount), 0);

  const [year, monthPart] = month.split('-').map(Number);
  const lastDay = daysInMonth(month);
  // 0 = 日曜。この数だけ先頭に空白を入れる
  const leadingBlanks = new Date(year ?? 1970, (monthPart ?? 1) - 1, 1).getDay();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push(EMPTY_CELL);
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const date = `${month}-${`${day}`.padStart(2, '0')}`;
    const totalAmount = totalByDate.get(date) ?? 0;

    cells.push({
      date,
      day,
      totalAmount,
      intensity: toIntensity(totalAmount, dailyBudget, maxAmount),
      isFuture: date > today,
    });
  }

  // 末尾を7の倍数まで埋める
  while (cells.length % 7 !== 0) {
    cells.push(EMPTY_CELL);
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return { weeks, maxAmount };
}
