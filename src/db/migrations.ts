import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

/**
 * v1: 要件定義 §3.1〜3.5 のスキーマ。
 * 末尾でサンプルプリセットを3件投入する（要件定義 §4.1「初回起動時にサンプルプリセットを3件投入する」）。
 */
const V1_SCHEMA = `
CREATE TABLE records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      INTEGER NOT NULL,
  category    TEXT    NOT NULL,
  drink_type  TEXT,
  is_solo     INTEGER NOT NULL DEFAULT 0,
  memo        TEXT,
  spent_at    TEXT    NOT NULL,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE INDEX idx_records_spent_at ON records(spent_at);
CREATE INDEX idx_records_category ON records(category);

CREATE TABLE companions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,
  use_count    INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at   TEXT    NOT NULL
);

CREATE INDEX idx_companions_last_used ON companions(last_used_at DESC);

CREATE TABLE record_companions (
  record_id    INTEGER NOT NULL,
  companion_id INTEGER NOT NULL,
  PRIMARY KEY (record_id, companion_id),
  FOREIGN KEY (record_id)    REFERENCES records(id)    ON DELETE CASCADE,
  FOREIGN KEY (companion_id) REFERENCES companions(id) ON DELETE CASCADE
);

CREATE INDEX idx_rc_companion ON record_companions(companion_id);

CREATE TABLE budgets (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  month  TEXT    NOT NULL UNIQUE,
  amount INTEGER NOT NULL
);

CREATE TABLE presets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT    NOT NULL,
  amount     INTEGER NOT NULL,
  category   TEXT    NOT NULL,
  drink_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
`;

/** 初期プリセット。金額は仮置き（要件定義 §10「プリセットの初期値」が未決定のため）。 */
const V1_SEED_PRESETS: readonly [string, number, string, string, number][] = [
  ['缶ビール 350ml', 220, 'convenience', 'beer', 0],
  ['缶ビール 500ml', 300, 'convenience', 'beer', 1],
  ['ハイボール 350ml', 180, 'convenience', 'highball', 2],
];

const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(V1_SCHEMA);

      for (const [label, amount, category, drinkType, sortOrder] of V1_SEED_PRESETS) {
        await db.runAsync(
          'INSERT INTO presets (label, amount, category, drink_type, sort_order) VALUES (?, ?, ?, ?, ?)',
          [label, amount, category, drinkType, sortOrder],
        );
      }
    },
  },
  {
    // カテゴリを4択から2択に統合する。
    // convenience / supermarket / other → home、bar → out。
    //
    // 順序が重要：先に bar を out にしてから、「out 以外」をまとめて home に倒す。
    // こうすると想定外の値が入っていても取りこぼさない。
    //
    // v1 のシードプリセット（convenience）もここで home に変換される。
    // v1 側を書き換えないのは、既存マイグレーションを改変しないため（CLAUDE.md §6）。
    version: 2,
    up: async (db) => {
      await db.runAsync("UPDATE records SET category = 'out'  WHERE category = 'bar'");
      await db.runAsync("UPDATE records SET category = 'home' WHERE category <> 'out'");
      await db.runAsync("UPDATE presets SET category = 'out'  WHERE category = 'bar'");
      await db.runAsync("UPDATE presets SET category = 'home' WHERE category <> 'out'");
    },
  },
];

/** 現在のスキーマバージョン。マイグレーション定義の最大値。 */
export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0,
);

async function readUserVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * 未適用のマイグレーションを昇順に適用する（要件定義 §3.6）。
 *
 * 注意: PRAGMA はバインド変数を受け付けないため user_version の設定だけは値を埋め込む。
 * 埋め込むのは上の MIGRATIONS に定義した number 型の version のみで、外部入力は混入しない。
 * ここ以外で SQL を文字列連結で組み立ててはならない（CLAUDE.md §6）。
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await readUserVersion(db);

  const pending = MIGRATIONS.filter((migration) => migration.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
  }
}
