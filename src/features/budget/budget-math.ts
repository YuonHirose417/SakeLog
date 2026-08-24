import type { DailyTotal } from '@/types/analytics';

/**
 * 予算まわりの計算。副作用のない純粋関数だけをここに置き、単体で検証できるようにする。
 * 日付はすべてローカル時刻基準の文字列（'YYYY-MM-DD' / 'YYYY-MM'）で扱う。
 */

/** ペース予測を出すのに必要な最低経過日数。これ未満は振れ幅が大きすぎるため表示しない。 */
export const MIN_DAYS_FOR_FORECAST = 3;

/** ストリークを遡る上限。これ以上は「180日以上」として扱う。 */
export const MAX_STREAK_DAYS = 180;

/** 'YYYY-MM' の日数。 */
export function daysInMonth(month: string): number {
  const [year, monthPart] = month.split('-').map(Number);

  if (year === undefined || monthPart === undefined) {
    return 30;
  }

  // 翌月の 0 日 = 当月の末日
  return new Date(year, monthPart, 0).getDate();
}

/** 'YYYY-MM-DD' の日部分。 */
export function dayOfMonthOf(date: string): number {
  return Number(date.slice(8, 10));
}

/** 経過日数（今日を含む）。月の1日なら 1。 */
export function elapsedDaysOf(today: string): number {
  return dayOfMonthOf(today);
}

/** 残日数。今日は経過済みとして数えないので、24日／31日の月なら 7。 */
export function remainingDaysOf(today: string): number {
  return daysInMonth(today.slice(0, 7)) - dayOfMonthOf(today);
}

/** 日割り予算。月予算 ÷ その月の日数。 */
export function dailyBudgetOf(monthlyBudget: number, month: string): number {
  return monthlyBudget / daysInMonth(month);
}

type PaceForecastInput = {
  /** 今月のこれまでの支出合計 */
  totalAmount: number;
  /** 経過日数（今日を含む） */
  elapsedDays: number;
  /** その月の日数 */
  daysInMonth: number;
};

/**
 * ペース予測 = (今月支出 ÷ 経過日数) × その月の日数（要件定義 §4.3）。
 *
 * 経過日数が {@link MIN_DAYS_FOR_FORECAST} 未満のときは null を返す。
 * 1日目に 3,000 円使っただけで「月末 93,000 円」と出るのは実態を表さないため、
 * 式は変えずに「まだ出さない」という扱いにしている。
 */
export function calcPaceForecast({
  totalAmount,
  elapsedDays,
  daysInMonth: monthLength,
}: PaceForecastInput): number | null {
  if (elapsedDays < MIN_DAYS_FOR_FORECAST || elapsedDays <= 0) {
    return null;
  }

  return Math.round((totalAmount / elapsedDays) * monthLength);
}

type StreakInput = {
  /** 判定期間の日別合計（記録のある日だけでよい）。 */
  dailyTotals: readonly DailyTotal[];
  /** 月キー 'YYYY-MM' から、その月の月予算を返す。未設定なら null。 */
  monthlyBudgetOf: (month: string) => number | null;
  /** 最初の記録日 'YYYY-MM-DD'。記録が無ければ null。 */
  firstRecordDate: string | null;
  /** 今日 'YYYY-MM-DD'。 */
  today: string;
};

/**
 * 連続で日割り予算内に収まった日数（要件定義 §4.3）。
 *
 * - **昨日から**遡って数える。今日はまだ終わっていないので判定に含めない
 *   （含めると、今日の夜に飲んだ瞬間にストリークが 0 に戻ってしまう）
 * - 記録のない日は 0 円なので「予算内」として継続する
 * - 日割り予算は「その日が属する月」の予算 ÷ その月の日数。月をまたいでも正しく判定する
 * - 最初の記録日より前には遡らない（アプリを使う前の期間を延々と加算しないため）
 * - 記録が1件も無い場合は判定不能なので null を返す
 * - 遡る途中で予算が設定されていない月に入ったら、そこで打ち切ってそれまでの日数を返す
 *   （予算が一度も設定されていなければ 0 になる。画面側は 0 のとき非表示にする）
 */
export function calcStreak({
  dailyTotals,
  monthlyBudgetOf,
  firstRecordDate,
  today,
}: StreakInput): number | null {
  if (firstRecordDate === null) {
    return null;
  }

  const totalByDate = new Map<string, number>();
  for (const entry of dailyTotals) {
    totalByDate.set(entry.date, entry.totalAmount);
  }

  let streak = 0;
  const cursor = parseDate(today);
  cursor.setDate(cursor.getDate() - 1); // 昨日から

  while (streak < MAX_STREAK_DAYS) {
    const date = formatDate(cursor);

    if (date < firstRecordDate) {
      break;
    }

    const monthlyBudget = monthlyBudgetOf(date.slice(0, 7));

    if (monthlyBudget === null) {
      // その日に適用できる予算が無ければ判定できないので、そこで打ち切る
      break;
    }

    const spent = totalByDate.get(date) ?? 0;

    if (spent > dailyBudgetOf(monthlyBudget, date.slice(0, 7))) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function formatDate(date: Date): string {
  const pad = (value: number): string => `${value}`.padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ストリークの起点となる日付（今日から MAX_STREAK_DAYS 日前）。SQL の検索範囲に使う。 */
export function streakRangeStart(today: string): string {
  const cursor = parseDate(today);
  cursor.setDate(cursor.getDate() - MAX_STREAK_DAYS);

  return formatDate(cursor);
}
