import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from '@/db/migrations';

const DATABASE_NAME = 'sakelog.db';

/**
 * 接続の Promise を保持して 1 接続に固定する。
 * 複数の hooks から同時に呼ばれても open は一度しか走らない。
 */
let connection: Promise<SQLiteDatabase> | null = null;

async function connect(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);

  // SQLite は外部キー制約が既定で OFF。接続ごとに必ず有効化する（要件定義 §3.6）。
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.execAsync('PRAGMA journal_mode = WAL');

  await runMigrations(db);

  return db;
}

/**
 * マイグレーション適用済みの接続を返す。
 * DB を触る処理はすべてここを経由すること（CLAUDE.md §6）。
 */
export function getDatabase(): Promise<SQLiteDatabase> {
  connection ??= connect().catch((error: unknown) => {
    // 失敗した Promise を握ったままにすると以降ずっと同じエラーを返してしまうため破棄する
    connection = null;
    throw error;
  });

  return connection;
}

/** テストや「データ全削除」時に接続を閉じて破棄する。 */
export async function closeDatabase(): Promise<void> {
  if (connection === null) {
    return;
  }

  const db = await connection;
  connection = null;
  await db.closeAsync();
}
