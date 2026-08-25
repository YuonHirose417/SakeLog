import { getDatabase } from '@/db/client';

import type {
  CategoryBreakdown,
  CompanionSortKey,
  CompanionStat,
  CompanionTrendPoint,
  DailyTotal,
  MonthlySummary,
  YearlySummary,
} from '@/types/analytics';
import type { Category } from '@/types/record';

/**
 * 集計はすべて SQL 側で完結させる（CLAUDE.md §6 / 要件定義 §7.2）。
 * JS 側で全件ループして合計を出さないこと。
 */

type SummaryRow = {
  total_amount: number;
  record_count: number;
  home_amount: number;
  out_amount: number;
};

type CategoryRow = {
  category: string;
  total_amount: number;
  record_count: number;
};

type CompanionStatRow = {
  id: number;
  name: string;
  visit_count: number;
  total_amount: number;
  avg_amount: number;
};

type TrendRow = {
  month: string;
  visit_count: number;
  total_amount: number;
};

function toCategory(value: string): Category {
  switch (value) {
    case 'convenience':
    case 'supermarket':
    case 'bar':
      return value;
    default:
      return 'other';
  }
}

function toCompanionStat(row: CompanionStatRow): CompanionStat {
  return {
    companionId: row.id,
    name: row.name,
    visitCount: row.visit_count,
    totalAmount: row.total_amount,
    avgAmount: row.avg_amount,
  };
}

/**
 * 人別ランキングの ORDER BY。
 * ORDER BY はバインド変数にできないため、union 型から固定の SQL 断片へ引く表にしている。
 * 外部由来の文字列を SQL に混ぜないこと（CLAUDE.md §6）。
 */
const COMPANION_ORDER_BY: Readonly<Record<CompanionSortKey, string>> = {
  total: 'total_amount DESC, visit_count DESC, c.name ASC',
  average: 'avg_amount DESC, visit_count DESC, c.name ASC',
};

/** 月次サマリー。宅飲み / 外飲みの内訳も同じクエリで出す（要件定義 §4.4）。 */
export async function findMonthlySummary(month: string): Promise<MonthlySummary> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<SummaryRow>(
    `SELECT
       COALESCE(SUM(amount), 0)                                                    AS total_amount,
       COUNT(*)                                                                    AS record_count,
       COALESCE(SUM(CASE WHEN category IN ('convenience', 'supermarket')
                         THEN amount ELSE 0 END), 0)                               AS home_amount,
       COALESCE(SUM(CASE WHEN category = 'bar' THEN amount ELSE 0 END), 0)         AS out_amount
     FROM records
     WHERE strftime('%Y-%m', spent_at) = ?`,
    [month],
  );

  return {
    month,
    totalAmount: row?.total_amount ?? 0,
    recordCount: row?.record_count ?? 0,
    homeAmount: row?.home_amount ?? 0,
    outAmount: row?.out_amount ?? 0,
  };
}

/**
 * 期間内の日別合計（ストリーク判定用）。
 * 記録のない日は行が返らない。呼び出し側で 0 円として扱う。
 */
export async function findDailyTotals(fromDate: string, toDate: string): Promise<DailyTotal[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<{ date: string; total_amount: number }>(
    `SELECT substr(spent_at, 1, 10) AS date,
            SUM(amount)             AS total_amount
     FROM records
     WHERE substr(spent_at, 1, 10) BETWEEN ? AND ?
     GROUP BY date
     ORDER BY date`,
    [fromDate, toDate],
  );

  return rows.map((row) => ({ date: row.date, totalAmount: row.total_amount }));
}

/**
 * 指定月の「N日まで」の累計（前月同期比に使う）。
 * 月全体と比べると進行中の月が不利になるため、同じ日数で切って比較する。
 */
export async function findMonthToDateTotal(month: string, dayOfMonth: number): Promise<number> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{ total_amount: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total_amount
     FROM records
     WHERE strftime('%Y-%m', spent_at) = ?
       AND CAST(strftime('%d', spent_at) AS INTEGER) <= ?`,
    [month, dayOfMonth],
  );

  return row?.total_amount ?? 0;
}

/**
 * 最初の記録の日付（'YYYY-MM-DD'）。記録が1件もなければ null。
 * ストリークを記録開始前まで遡らせないための下限として使う。
 */
export async function findFirstRecordDate(): Promise<string | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<{ first_date: string | null }>(
    'SELECT substr(MIN(spent_at), 1, 10) AS first_date FROM records',
  );

  return row?.first_date ?? null;
}

/** カテゴリ別内訳。金額の大きい順。 */
export async function findCategoryBreakdown(month: string): Promise<CategoryBreakdown[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<CategoryRow>(
    `SELECT category,
            SUM(amount) AS total_amount,
            COUNT(*)    AS record_count
     FROM records
     WHERE strftime('%Y-%m', spent_at) = ?
     GROUP BY category
     ORDER BY total_amount DESC`,
    [month],
  );

  return rows.map((row) => ({
    category: toCategory(row.category),
    totalAmount: row.total_amount,
    recordCount: row.record_count,
  }));
}

type CompanionRankingOptions = {
  sortKey?: CompanionSortKey;
  /** 最低回数のフィルタ。平均額ソート時は 3 を既定にする想定（要件定義 §4.4）。 */
  minVisits?: number;
  limit?: number;
};

/**
 * 人別集計（要件定義 §4.4、差別化の核）。
 *
 * 1件の記録金額は紐づく全同行者にそれぞれ丸ごと計上する。頭割りはしない。
 * したがって合計は総支出と一致しない。画面側で必ず注記すること。
 */
export async function findCompanionRanking(
  month: string,
  options: CompanionRankingOptions = {},
): Promise<CompanionStat[]> {
  const db = await getDatabase();
  const { sortKey = 'total', minVisits = 1, limit } = options;

  const rows = await db.getAllAsync<CompanionStatRow>(
    `SELECT
       c.id,
       c.name,
       COUNT(DISTINCT r.id) AS visit_count,
       SUM(r.amount)        AS total_amount,
       AVG(r.amount)        AS avg_amount
     FROM companions c
     JOIN record_companions rc ON rc.companion_id = c.id
     JOIN records r            ON r.id = rc.record_id
     WHERE strftime('%Y-%m', r.spent_at) = ?
     GROUP BY c.id
     HAVING COUNT(DISTINCT r.id) >= ?
     ORDER BY ${COMPANION_ORDER_BY[sortKey]}
     LIMIT ?`,
    [month, minVisits, limit ?? -1],
  );

  return rows.map(toCompanionStat);
}

/** 年次の人別集計。月次と同じ方針で、年で切る。 */
export async function findCompanionRankingByYear(
  year: string,
  options: CompanionRankingOptions = {},
): Promise<CompanionStat[]> {
  const db = await getDatabase();
  const { sortKey = 'total', minVisits = 1, limit } = options;

  const rows = await db.getAllAsync<CompanionStatRow>(
    `SELECT
       c.id,
       c.name,
       COUNT(DISTINCT r.id) AS visit_count,
       SUM(r.amount)        AS total_amount,
       AVG(r.amount)        AS avg_amount
     FROM companions c
     JOIN record_companions rc ON rc.companion_id = c.id
     JOIN records r            ON r.id = rc.record_id
     WHERE strftime('%Y', r.spent_at) = ?
     GROUP BY c.id
     HAVING COUNT(DISTINCT r.id) >= ?
     ORDER BY ${COMPANION_ORDER_BY[sortKey]}
     LIMIT ?`,
    [year, minVisits, limit ?? -1],
  );

  return rows.map(toCompanionStat);
}

/** 特定の同行者の月別推移（要件定義 §4.4）。 */
export async function findCompanionMonthlyTrend(
  companionId: number,
): Promise<CompanionTrendPoint[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<TrendRow>(
    `SELECT
       strftime('%Y-%m', r.spent_at) AS month,
       COUNT(DISTINCT r.id)          AS visit_count,
       SUM(r.amount)                 AS total_amount
     FROM records r
     JOIN record_companions rc ON rc.record_id = r.id
     WHERE rc.companion_id = ?
     GROUP BY month
     ORDER BY month`,
    [companionId],
  );

  return rows.map((row) => ({
    month: row.month,
    visitCount: row.visit_count,
    totalAmount: row.total_amount,
  }));
}

/** 年間の月別推移（分析画面のグラフ用）。 */
export async function findMonthlyTrendByYear(year: string): Promise<CompanionTrendPoint[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<TrendRow>(
    `SELECT
       strftime('%Y-%m', spent_at) AS month,
       COUNT(*)                    AS visit_count,
       SUM(amount)                 AS total_amount
     FROM records
     WHERE strftime('%Y', spent_at) = ?
     GROUP BY month
     ORDER BY month`,
    [year],
  );

  return rows.map((row) => ({
    month: row.month,
    visitCount: row.visit_count,
    totalAmount: row.total_amount,
  }));
}

/** 年次サマリー（Pro）。最も回数の多かった相手 / 最も高くついた相手を含む。 */
export async function findYearlySummary(year: string): Promise<YearlySummary> {
  const db = await getDatabase();

  const totals = await db.getFirstAsync<{ total_amount: number; record_count: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total_amount,
            COUNT(*)                 AS record_count
     FROM records
     WHERE strftime('%Y', spent_at) = ?`,
    [year],
  );

  // 合計額（total）が最大 = 最も高くついた相手
  const [mostExpensive] = await findCompanionRankingByYear(year, { sortKey: 'total', limit: 1 });

  // 回数（visit_count）が最大 = 最も回数の多かった相手
  const mostFrequent = await db.getFirstAsync<CompanionStatRow>(
    `SELECT
       c.id,
       c.name,
       COUNT(DISTINCT r.id) AS visit_count,
       SUM(r.amount)        AS total_amount,
       AVG(r.amount)        AS avg_amount
     FROM companions c
     JOIN record_companions rc ON rc.companion_id = c.id
     JOIN records r            ON r.id = rc.record_id
     WHERE strftime('%Y', r.spent_at) = ?
     GROUP BY c.id
     ORDER BY visit_count DESC, total_amount DESC, c.name ASC
     LIMIT 1`,
    [year],
  );

  return {
    year,
    totalAmount: totals?.total_amount ?? 0,
    recordCount: totals?.record_count ?? 0,
    mostFrequentCompanion: mostFrequent === null ? null : toCompanionStat(mostFrequent),
    mostExpensiveCompanion: mostExpensive ?? null,
  };
}
