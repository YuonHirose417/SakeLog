import { getDatabase } from '@/db/client';

import { nowIso } from '@/lib/datetime';

import type { Companion } from '@/types/companion';

import type { SQLiteDatabase } from 'expo-sqlite';

type CompanionRow = {
  id: number;
  name: string;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
};

function toCompanion(row: CompanionRow): Companion {
  return {
    id: row.id,
    name: row.name,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

/**
 * 名前で同行者を UPSERT し、id を返す（要件定義 §4.2）。
 * 完全一致のみ同一人物として扱う。表記ゆれの統合は mergeCompanions で行う。
 *
 * 記録の保存と同じトランザクションに乗せるため、呼び出し側が db を渡せるようにしている。
 */
export async function upsertCompanionByName(
  name: string,
  usedAt: string,
  db: SQLiteDatabase,
): Promise<number> {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error('同行者名が空です');
  }

  await db.runAsync(
    `INSERT INTO companions (name, use_count, last_used_at, created_at)
     VALUES (?, 1, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       use_count    = use_count + 1,
       last_used_at = excluded.last_used_at`,
    [trimmed, usedAt, nowIso()],
  );

  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM companions WHERE name = ?', [
    trimmed,
  ]);

  if (row === null) {
    throw new Error(`同行者の保存に失敗しました: ${trimmed}`);
  }

  return row.id;
}

/** 同行者を直近に飲んだ順で返す（要件定義 §4.2 の候補チップ用）。 */
export async function findAllCompanions(): Promise<Companion[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<CompanionRow>(
    `SELECT id, name, use_count, last_used_at, created_at
     FROM companions
     ORDER BY last_used_at DESC, use_count DESC, name ASC`,
  );

  return rows.map(toCompanion);
}

export async function findCompanionById(id: number): Promise<Companion | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<CompanionRow>(
    `SELECT id, name, use_count, last_used_at, created_at FROM companions WHERE id = ?`,
    [id],
  );

  return row === null ? null : toCompanion(row);
}

/** 同行者名を変更する（設定 > 同行者の管理）。 */
export async function renameCompanion(id: number, name: string): Promise<void> {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error('同行者名が空です');
  }

  const db = await getDatabase();
  await db.runAsync('UPDATE companions SET name = ? WHERE id = ?', [trimmed, id]);
}

/**
 * 表記ゆれの統合（要件定義 §4.2）。
 * source を target に統合し、record_companions を付け替えてから source を削除する。
 *
 * 付け替えは INSERT OR IGNORE → DELETE の順で行う。
 * UPDATE で直接付け替えると、同じ記録に source と target の両方が紐づいていた場合に
 * 主キー (record_id, companion_id) が衝突するため。
 */
export async function mergeCompanions(sourceId: number, targetId: number): Promise<void> {
  if (sourceId === targetId) {
    return;
  }

  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR IGNORE INTO record_companions (record_id, companion_id)
       SELECT record_id, ? FROM record_companions WHERE companion_id = ?`,
      [targetId, sourceId],
    );

    await db.runAsync('DELETE FROM record_companions WHERE companion_id = ?', [sourceId]);

    // 統合後の実際の紐づけ件数で use_count を引き直す
    await db.runAsync(
      `UPDATE companions
       SET use_count = (SELECT COUNT(*) FROM record_companions WHERE companion_id = ?),
           last_used_at = (
             SELECT MAX(r.spent_at)
             FROM records r
             JOIN record_companions rc ON rc.record_id = r.id
             WHERE rc.companion_id = ?
           )
       WHERE id = ?`,
      [targetId, targetId, targetId],
    );

    await db.runAsync('DELETE FROM companions WHERE id = ?', [sourceId]);
  });
}

/** 同行者を削除する。record_companions は ON DELETE CASCADE で消える。 */
export async function deleteCompanion(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM companions WHERE id = ?', [id]);
}
