import type { CompanionTrendPoint } from '@/types/analytics';

export type MonthlyTrendPoint = {
  /** 'YYYY-MM' */
  month: string;
  /** 1〜12 */
  monthNumber: number;
  totalAmount: number;
  recordCount: number;
};

export type MonthlyTrend = {
  points: MonthlyTrendPoint[];
  /** 横棒の比率計算に使う最大値。全月 0 のときは 0。 */
  maxAmount: number;
};

/**
 * 月別推移グラフ用に月を埋める。
 *
 * `findMonthlyTrendByYear` は記録のある月しか返さないため、抜けた月を 0 で補う。
 * 対象が今年の場合は今月までで打ち切る（1月に12行の空欄が並ぶのを避けるため）。
 * 過去の年は12ヶ月すべて返す。
 */
export function buildMonthlyTrend(
  year: string,
  points: readonly CompanionTrendPoint[],
  currentMonth: string,
): MonthlyTrend {
  const byMonth = new Map(points.map((point) => [point.month, point]));
  const isCurrentYear = currentMonth.slice(0, 4) === year;
  const lastMonth = isCurrentYear ? Number(currentMonth.slice(5, 7)) : 12;

  const filled: MonthlyTrendPoint[] = [];

  for (let monthNumber = 1; monthNumber <= lastMonth; monthNumber += 1) {
    const month = `${year}-${`${monthNumber}`.padStart(2, '0')}`;
    const found = byMonth.get(month);

    filled.push({
      month,
      monthNumber,
      totalAmount: found?.totalAmount ?? 0,
      recordCount: found?.visitCount ?? 0,
    });
  }

  const maxAmount = filled.reduce((max, point) => Math.max(max, point.totalAmount), 0);

  return { points: filled, maxAmount };
}
