import { getDatabase } from '@/db/client';

import type { Preset, PresetInput } from '@/types/preset';
import type { Category, DrinkType } from '@/types/record';

type PresetRow = {
  id: number;
  label: string;
  amount: number;
  category: string;
  drink_type: string | null;
  sort_order: number;
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

function toDrinkType(value: string | null): DrinkType | null {
  switch (value) {
    case 'beer':
    case 'sake':
    case 'wine':
    case 'highball':
    case 'other':
      return value;
    default:
      return null;
  }
}

function toPreset(row: PresetRow): Preset {
  return {
    id: row.id,
    label: row.label,
    amount: row.amount,
    category: toCategory(row.category),
    drinkType: toDrinkType(row.drink_type),
    sortOrder: row.sort_order,
  };
}

/** 表示順にプリセットを返す（ホームの横スクロール用）。 */
export async function findAllPresets(): Promise<Preset[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<PresetRow>(
    `SELECT id, label, amount, category, drink_type, sort_order
     FROM presets
     ORDER BY sort_order ASC, id ASC`,
  );

  return rows.map(toPreset);
}

/** プリセットを追加する。sort_order 未指定なら末尾に置く。 */
export async function createPreset(input: PresetInput): Promise<number> {
  const db = await getDatabase();

  const sortOrder =
    input.sortOrder ??
    (
      await db.getFirstAsync<{ next_order: number }>(
        'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM presets',
      )
    )?.next_order ??
    0;

  const result = await db.runAsync(
    `INSERT INTO presets (label, amount, category, drink_type, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [input.label.trim(), input.amount, input.category, input.drinkType ?? null, sortOrder],
  );

  return result.lastInsertRowId;
}

export async function updatePreset(id: number, input: PresetInput): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE presets
     SET label = ?, amount = ?, category = ?, drink_type = ?, sort_order = COALESCE(?, sort_order)
     WHERE id = ?`,
    [
      input.label.trim(),
      input.amount,
      input.category,
      input.drinkType ?? null,
      input.sortOrder ?? null,
      id,
    ],
  );
}

export async function deletePreset(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM presets WHERE id = ?', [id]);
}

/** 並び替えを保存する。渡された配列の順に sort_order を振り直す。 */
export async function reorderPresets(orderedIds: readonly number[]): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE presets SET sort_order = ? WHERE id = ?', [index, id]);
    }
  });
}
