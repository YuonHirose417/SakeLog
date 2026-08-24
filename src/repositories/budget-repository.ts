import { getDatabase } from '@/db/client';

import type { Budget } from '@/types/budget';

type BudgetRow = {
  id: number;
  month: string;
  amount: number;
};

function toBudget(row: BudgetRow): Budget {
  return { id: row.id, month: row.month, amount: row.amount };
}

/** 月予算を設定する。同じ月に再設定した場合は金額を上書きする。 */
export async function upsertBudget(month: string, amount: number): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO budgets (month, amount)
     VALUES (?, ?)
     ON CONFLICT(month) DO UPDATE SET amount = excluded.amount`,
    [month, amount],
  );
}

/** 指定月に明示的に設定された予算だけを返す。設定画面の表示用。 */
export async function findBudgetByMonth(month: string): Promise<Budget | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<BudgetRow>(
    'SELECT id, month, amount FROM budgets WHERE month = ?',
    [month],
  );

  return row === null ? null : toBudget(row);
}

/**
 * 指定月に適用される予算を返す（要件定義 §4.3「未設定の月は前月の値を引き継ぐ」）。
 * 指定月以前で最も新しい設定を SQL 側で1件だけ引く。
 * 一度も設定されていなければ null。
 */
export async function findEffectiveBudget(month: string): Promise<Budget | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<BudgetRow>(
    `SELECT id, month, amount
     FROM budgets
     WHERE month <= ?
     ORDER BY month DESC
     LIMIT 1`,
    [month],
  );

  return row === null ? null : toBudget(row);
}

/** 設定済みの予算を新しい月から順に返す（Pro の「予算の複数設定」画面用）。 */
export async function findAllBudgets(): Promise<Budget[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<BudgetRow>(
    'SELECT id, month, amount FROM budgets ORDER BY month DESC',
  );

  return rows.map(toBudget);
}

export async function deleteBudget(month: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM budgets WHERE month = ?', [month]);
}
