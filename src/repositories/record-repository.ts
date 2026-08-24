import { getDatabase } from '@/db/client';

import { upsertCompanionByName } from '@/repositories/companion-repository';

import { nowIso } from '@/lib/datetime';

import type { Companion } from '@/types/companion';
import type {
  SpendingRecord,
  SpendingRecordInput,
  SpendingRecordWithCompanions,
} from '@/types/record';

import type { SQLiteDatabase } from 'expo-sqlite';

type RecordRow = {
  id: number;
  amount: number;
  category: string;
  drink_type: string | null;
  is_solo: number;
  memo: string | null;
  spent_at: string;
  created_at: string;
  updated_at: string;
};

type CompanionRow = {
  id: number;
  name: string;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
};

type RecordCompanionRow = CompanionRow & { record_id: number };

const RECORD_COLUMNS = `id, amount, category, drink_type, is_solo, memo, spent_at, created_at, updated_at`;

/**
 * SQLite の TEXT はスキーマ上 union を保証できないため、読み出し時に型を絞り込む。
 * 想定外の値が入っていた場合は 'other' に倒して画面を壊さない。
 */
function toCategory(value: string): SpendingRecord['category'] {
  switch (value) {
    case 'convenience':
    case 'supermarket':
    case 'bar':
      return value;
    default:
      return 'other';
  }
}

function toDrinkType(value: string | null): SpendingRecord['drinkType'] {
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

function toRecord(row: RecordRow): SpendingRecord {
  return {
    id: row.id,
    amount: row.amount,
    category: toCategory(row.category),
    drinkType: toDrinkType(row.drink_type),
    isSolo: row.is_solo === 1,
    memo: row.memo,
    spentAt: row.spent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCompanion(row: CompanionRow): Companion {
  return {
    id: row.id,
    name: row.name,
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

/** 入力の同行者名を trim し、空文字と重複を除く（要件定義 §4.2）。 */
function normalizeCompanionNames(names: readonly string[] | undefined): string[] {
  if (names === undefined) {
    return [];
  }

  const trimmed = names.map((name) => name.trim()).filter((name) => name.length > 0);

  return [...new Set(trimmed)];
}

/** 複数の記録に同行者をまとめて紐づけて返す（N+1 を避けるため 1 クエリで引く）。 */
async function attachCompanions(
  db: SQLiteDatabase,
  records: SpendingRecord[],
): Promise<SpendingRecordWithCompanions[]> {
  if (records.length === 0) {
    return [];
  }

  // 組み立てているのは '?' の個数だけで、値は必ずバインドする（CLAUDE.md §6）
  const placeholders = records.map(() => '?').join(', ');
  const ids = records.map((record) => record.id);

  const rows = await db.getAllAsync<RecordCompanionRow>(
    `SELECT rc.record_id, c.id, c.name, c.use_count, c.last_used_at, c.created_at
     FROM record_companions rc
     JOIN companions c ON c.id = rc.companion_id
     WHERE rc.record_id IN (${placeholders})
     ORDER BY c.name ASC`,
    ids,
  );

  const byRecordId = new Map<number, Companion[]>();

  for (const row of rows) {
    const list = byRecordId.get(row.record_id) ?? [];
    list.push(toCompanion(row));
    byRecordId.set(row.record_id, list);
  }

  return records.map((record) => ({
    ...record,
    companions: byRecordId.get(record.id) ?? [],
  }));
}

/**
 * 同行者名を UPSERT して記録に紐づける。
 * 「一人で飲んだ」記録には同行者を作らない（要件定義 §4.2 / CLAUDE.md §7）。
 */
async function linkCompanions(
  db: SQLiteDatabase,
  recordId: number,
  names: readonly string[],
  spentAt: string,
): Promise<void> {
  for (const name of names) {
    const companionId = await upsertCompanionByName(name, spentAt, db);

    await db.runAsync(
      'INSERT OR IGNORE INTO record_companions (record_id, companion_id) VALUES (?, ?)',
      [recordId, companionId],
    );
  }
}

/**
 * 記録を作成し、同行者の UPSERT と紐づけまでを 1 トランザクションで行う（CLAUDE.md §6）。
 * 戻り値は作成された記録の id。
 */
export async function createRecord(input: SpendingRecordInput): Promise<number> {
  const db = await getDatabase();
  const isSolo = input.isSolo ?? false;
  const names = isSolo ? [] : normalizeCompanionNames(input.companionNames);
  const timestamp = nowIso();

  let recordId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO records (amount, category, drink_type, is_solo, memo, spent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.amount,
        input.category,
        input.drinkType ?? null,
        isSolo ? 1 : 0,
        input.memo ?? null,
        input.spentAt,
        timestamp,
        timestamp,
      ],
    );

    recordId = result.lastInsertRowId;

    await linkCompanions(db, recordId, names, input.spentAt);
  });

  return recordId;
}

/**
 * 記録を更新する。同行者の紐づけは一度削除してから貼り直す。
 * 記録本体の更新と紐づけの張り替えを 1 トランザクションで行う（CLAUDE.md §6）。
 */
export async function updateRecord(id: number, input: SpendingRecordInput): Promise<void> {
  const db = await getDatabase();
  const isSolo = input.isSolo ?? false;
  const names = isSolo ? [] : normalizeCompanionNames(input.companionNames);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE records
       SET amount = ?, category = ?, drink_type = ?, is_solo = ?, memo = ?, spent_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.amount,
        input.category,
        input.drinkType ?? null,
        isSolo ? 1 : 0,
        input.memo ?? null,
        input.spentAt,
        nowIso(),
        id,
      ],
    );

    await db.runAsync('DELETE FROM record_companions WHERE record_id = ?', [id]);
    await linkCompanions(db, id, names, input.spentAt);
  });
}

/** 記録を削除する。record_companions は ON DELETE CASCADE で消える。 */
export async function deleteRecord(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM records WHERE id = ?', [id]);
}

export async function findRecordById(id: number): Promise<SpendingRecordWithCompanions | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<RecordRow>(
    `SELECT ${RECORD_COLUMNS} FROM records WHERE id = ?`,
    [id],
  );

  if (row === null) {
    return null;
  }

  const [record] = await attachCompanions(db, [toRecord(row)]);

  return record ?? null;
}

/** 指定月（'YYYY-MM'）の記録を新しい順に返す。 */
export async function findRecordsByMonth(month: string): Promise<SpendingRecordWithCompanions[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<RecordRow>(
    `SELECT ${RECORD_COLUMNS}
     FROM records
     WHERE strftime('%Y-%m', spent_at) = ?
     ORDER BY spent_at DESC, id DESC`,
    [month],
  );

  return attachCompanions(db, rows.map(toRecord));
}

/** 履歴一覧用。新しい順にページングして返す。 */
export async function findRecentRecords(
  limit: number,
  offset = 0,
): Promise<SpendingRecordWithCompanions[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<RecordRow>(
    `SELECT ${RECORD_COLUMNS}
     FROM records
     ORDER BY spent_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );

  return attachCompanions(db, rows.map(toRecord));
}

/**
 * 指定月以降の記録を新しい順に返す。
 * 無料版の「直近3ヶ月まで」の絞り込みに使う（境界の判定は課金機能側の責務）。
 */
export async function findRecordsSinceMonth(
  month: string,
): Promise<SpendingRecordWithCompanions[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<RecordRow>(
    `SELECT ${RECORD_COLUMNS}
     FROM records
     WHERE strftime('%Y-%m', spent_at) >= ?
     ORDER BY spent_at DESC, id DESC`,
    [month],
  );

  return attachCompanions(db, rows.map(toRecord));
}
