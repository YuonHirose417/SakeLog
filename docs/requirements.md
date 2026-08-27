# お酒特化型 家計簿アプリ 要件定義書

## 1. 概要

### 1.1 アプリ名
飲み代家計簿

- iOS のホーム画面での表示名（`CFBundleDisplayName`）は「飲み代」
- リポジトリ名・slug・bundleIdentifier・GitHub Pages の URL は内部識別子として `SakeLog` / `sakelog` のまま

### 1.2 コンセプト
お酒に使ったお金だけに特化した家計簿アプリ。
コンビニ酒・スーパー酒・外飲みを一元管理し、**節約を支援する**。

### 1.3 差別化ポイント
- お酒の支出だけに絞ることで、入力項目が極小になり継続しやすい
- 「誰と飲んだか」を記録し、**人別の支出集計**ができる（既存の家計簿アプリにない）
- 宅飲み / 外飲みの比率が可視化される

### 1.4 ターゲット
お酒代を減らしたいが、どこにいくら使っているか把握できていない20〜40代。

---

## 2. 技術スタック

| 領域 | 技術 |
|---|---|
| フレームワーク | Expo (React Native) |
| 言語 | TypeScript |
| ルーティング | Expo Router |
| データベース | expo-sqlite（完全ローカル） |
| 課金 | RevenueCat (react-native-purchases) |
| ビルド / 配信 | EAS Build / EAS Submit |
| バックエンド | なし |

### 2.1 開発環境（Windows）
- Node.js（fnm または nvm-windows 経由）
- Git
- EAS CLI は `npx eas-cli` で都度実行（グローバルインストールしない）
- **Expo Go では動作しない**（expo-sqlite / react-native-purchases がネイティブモジュールのため）
  → 最初から Development Build を作成して実機で開発する

```bash
npx eas-cli build --profile development --platform ios
```

### 2.2 制約
- オフライン完結。ネットワーク通信は課金判定（RevenueCat）のみ
- サーバーを持たない。ユーザーデータは端末外に一切送信しない

---

## 3. データベース設計

### 3.1 records（支出記録）

```sql
CREATE TABLE records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      INTEGER NOT NULL,          -- 円（整数）
  category    TEXT    NOT NULL,          -- 'convenience' | 'supermarket' | 'bar' | 'other'
  drink_type  TEXT,                      -- 'beer' | 'sake' | 'wine' | 'highball' | 'other'
  is_solo     INTEGER NOT NULL DEFAULT 0,-- 1 = 一人で飲んだ
  memo        TEXT,
  spent_at    TEXT    NOT NULL,          -- ISO8601（ローカル時刻・TZ指定子なし。下記注記を参照）
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE INDEX idx_records_spent_at ON records(spent_at);
CREATE INDEX idx_records_category ON records(category);
```

#### spent_at の保存形式（重要）

`spent_at` は**タイムゾーン指定子を持たないローカル時刻の ISO8601** で保存する。

- 例：`2026-08-01T00:30:00`（`Z` や `+09:00` を付けない）
- 理由：集計は `strftime('%Y-%m', spent_at)` で月を切るため、UTC で保存すると
  日本時間 8/1 0:30 の記録が UTC では 7/31 となり、**深夜の記録が前月に集計されてしまう**
- `created_at` / `updated_at` は集計に使わないため UTC（`Z` 付き）のままでよい
- 変換は `src/lib/datetime.ts` の `toLocalIso()` に集約する

### 3.2 companions（同行者マスタ）

```sql
CREATE TABLE companions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,
  use_count    INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at   TEXT    NOT NULL
);

CREATE INDEX idx_companions_last_used ON companions(last_used_at DESC);
```

### 3.3 record_companions（中間テーブル）

```sql
CREATE TABLE record_companions (
  record_id    INTEGER NOT NULL,
  companion_id INTEGER NOT NULL,
  PRIMARY KEY (record_id, companion_id),
  FOREIGN KEY (record_id)    REFERENCES records(id)    ON DELETE CASCADE,
  FOREIGN KEY (companion_id) REFERENCES companions(id) ON DELETE CASCADE
);

CREATE INDEX idx_rc_companion ON record_companions(companion_id);
```

### 3.4 budgets（予算）

```sql
CREATE TABLE budgets (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  month  TEXT    NOT NULL UNIQUE,  -- 'YYYY-MM'
  amount INTEGER NOT NULL
);
```

### 3.5 presets（よく買う酒）

```sql
CREATE TABLE presets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  label      TEXT    NOT NULL,     -- '缶ビール 500ml'
  amount     INTEGER NOT NULL,
  category   TEXT    NOT NULL,
  drink_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### 3.6 注意事項
- `PRAGMA foreign_keys = ON;` を接続時に必ず実行する（SQLite はデフォルト OFF）
- マイグレーション管理のため `PRAGMA user_version` でスキーマバージョンを管理する

---

## 4. 機能要件

### 4.1 記録機能（最重要）

**設計原則：3タップで記録完了できること。**

#### 入力項目
| 項目 | 必須 | 備考 |
|---|---|---|
| 金額 | ○ | 数値キーパッド。デフォルトフォーカス |
| カテゴリ | ○ | コンビニ / スーパー / 外飲み / その他 |
| 日付 | ○ | デフォルト＝今日。変更可 |
| 酒種 | × | 任意 |
| 誰と | × | 後述 |
| 一人で飲んだ | × | トグル |
| メモ | × | |

#### プリセット記録
- ホームにプリセットボタンを横並び表示
- タップ＝即記録（確認モーダルなし、トーストで「記録しました / 取り消す」）
- 初回起動時にサンプルプリセットを3件投入する

### 4.2 同行者機能

#### 入力挙動
1. **候補が0件のとき**：通常のテキスト入力のみ。プルダウンは表示しない
2. **候補が1件以上あるとき**：入力欄タップで候補チップを表示
   - 並び順：`last_used_at DESC`（直近に飲んだ人を上位に）
   - チップをタップで選択（複数選択可）
   - テキストを打てば新規追加も可能
3. **保存時**：`name` を trim して UPSERT

```sql
INSERT INTO companions (name, use_count, last_used_at, created_at)
VALUES (?, 1, ?, ?)
ON CONFLICT(name) DO UPDATE SET
  use_count    = use_count + 1,
  last_used_at = excluded.last_used_at;
```

#### 表記ゆれ対策
- 保存前に前後空白を trim
- 完全一致のみ同一人物として扱う
- 設定画面に「同行者の管理」を用意し、**リネーム / 統合（マージ）/ 削除**を可能にする
  - マージ時は `record_companions` の `companion_id` を付け替え、重複行は削除

#### 「一人で飲んだ」の扱い
- companions には登録しない。`records.is_solo` フラグで管理する
- 集計時に「ソロ飲み」として独立した軸で表示する

### 4.3 予算機能

- 月予算を設定（`budgets` テーブル）
- 未設定の月は前月の値を引き継ぐ
- ホームに以下を表示
  - 今月の合計支出
  - 予算残額 / 残日数
  - **ペース予測**：`(今月支出 ÷ 経過日数) × その月の日数`
  - 予測が予算超過の場合、警告表示

#### 予算オーバー時の見せ方
罪悪感を煽らず、**貯金換算**で表示する。

- 例：「先月より 2,400円 節約できました」
- 例：「このペースだと月末 32,000円（予算比 +7,000円）」
- 連続で予算内に収まった日数（ストリーク）を表示して継続を促す

### 4.4 集計・分析機能

#### 月次サマリー
- 合計金額、記録件数
- カテゴリ別内訳（円グラフ or 横棒グラフ）
- 宅飲み（convenience + supermarket）vs 外飲み（bar）の比率
- 前月比の増減

#### 人別集計（差別化の核）

**金額の割り振り方針**：1件の記録金額を、紐づく全同行者にそれぞれ**丸ごと**計上する。
- 定義は「その人と飲んだ日の自分の支出合計」
- 頭割りはしない（人数が多い飲み会が過小評価されるため）
- 画面上に「※合計は総支出と一致しません」と注記する

**月次クエリ**

```sql
SELECT
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
ORDER BY total_amount DESC;
```

**年次クエリ**：`WHERE strftime('%Y', r.spent_at) = ?` に変更

**特定の人の月別推移**

```sql
SELECT
  strftime('%Y-%m', r.spent_at) AS month,
  COUNT(DISTINCT r.id) AS visit_count,
  SUM(r.amount)        AS total_amount
FROM records r
JOIN record_companions rc ON rc.record_id = r.id
WHERE rc.companion_id = ?
GROUP BY month
ORDER BY month;
```

#### 表示ルール
- 「合計額」と「1回あたり平均額」の2軸でソート切替できること
- **回数を必ず併記する**（1回だけの相手が平均額トップに来る誤解を防ぐ）
- 平均額でソートする場合、「3回以上」のフィルタをデフォルトONにする

#### 年次サマリー
- 今年の総支出
- 最も回数の多かった相手 / 最も高くついた相手
- 月別推移グラフ

---

## 5. 課金要件

### 5.1 課金モデル
**買い切り（Non-Consumable）**

- Product ID：`com.yuonhirose.sakelog.pro`
- RevenueCat Entitlement 名：`pro`
- 価格：500円

### 5.2 無料 / 有料の切り分け

| 機能 | 無料 | Pro |
|---|:---:|:---:|
| 記録の登録・編集・削除 | 無制限 | 無制限 |
| 今月の合計・予算残・ペース警告 | ○ | ○ |
| 履歴閲覧 | 直近3ヶ月 | 全期間 |
| 人別集計 | 上位3人まで | 全件 |
| 平均単価ソート | × | ○ |
| 年次サマリー | × | ○ |

**記録機能には絶対に制限をかけない。** データが溜まって初めて価値が生まれるため。

#### 将来のアップデート予定

以下は Pro 機能として追加する予定だが、**現時点では未実装**。
実装するまでは Paywall の機能リストにも載せない
（購入しても使えない機能を宣伝することになるため）。

- カテゴリ × 人 のクロス分析
- CSV エクスポート
- 予算の複数設定（複数月の設定 UI が未実装。現状は無料・Pro とも今月分のみ設定できる）

### 5.3 課金導線
- 分析画面でロックされた4人目以降の行をぼかして表示 → タップで Paywall
- **起動直後のモーダル表示は禁止**（離脱を招く）

### 5.4 実装

```ts
// 起動時に一度取得し、グローバルステートに保持する
const info = await Purchases.getCustomerInfo();
const isPro = info.entitlements.active["pro"] !== undefined;
```

```ts
// 復元処理
const restore = async () => {
  try {
    const info = await Purchases.restorePurchases();
    if (info.entitlements.active["pro"]) {
      // Pro 有効化
    } else {
      // 「購入履歴が見つかりません」を表示
    }
  } catch (e) {
    // エラー表示
  }
};
```

### 5.5 必須要件（審査対策）
- **「購入を復元」ボタンを設定画面と Paywall の両方に設置**（非消耗型では必須。無いとリジェクト）
- 課金画面に価格を明記
- 課金画面からプライバシーポリシー・利用規約に遷移できること
- Sandbox テスターで「購入」「復元」を検証すること

### 5.6 将来の拡張余地
Entitlement を複数持てる構造にしておく（買い切りは後から収益が伸びないため、追加機能を別商品として販売できる余地を残す）。

---

## 6. 画面構成

```
/(tabs)
  ├─ index        ホーム
  ├─ history      履歴
  ├─ analytics    分析
  └─ settings     設定
/record/new       記録モーダル
/record/[id]      記録編集
/paywall          Paywall
/settings/companions  同行者管理
/settings/presets     プリセット管理
/settings/budget      予算設定
```

### 6.1 ホーム
- 今月の合計支出（大きく表示）
- 予算残額 / 残日数 / ペース予測
- ストリーク表示
- プリセットボタン（横スクロール）
- FAB：記録追加

### 6.2 履歴
- 日付降順のリスト、日別グルーピング
- 各行：金額 / カテゴリアイコン / 同行者名
- スワイプで削除、タップで編集
- 無料版は直近3ヶ月まで。それ以前は Paywall 誘導

### 6.3 分析
- 月次サマリー（グラフ）
- カテゴリ別内訳
- 宅飲み / 外飲み比率
- 人別ランキング（無料は上位3人、以降ぼかし）
- 年次サマリータブ（Pro）

### 6.4 設定
- 月予算の設定
- プリセット管理
- 同行者管理（リネーム / 統合 / 削除）
- 購入を復元
- プライバシーポリシー / 利用規約
- 飲酒に関する注意喚起リンク

---

## 7. 非機能要件

### 7.1 プライバシー
- **全データを端末内に保存し、外部送信しない**
- 同行者の実名が入るため、この点を App Store の説明文とアプリ内で明記する
- App Privacy（データ収集の申告）では「データを収集しない」を選択（RevenueCat の購入情報を除く）

### 7.2 パフォーマンス
- 記録が数千件になっても集計が体感で遅くならないこと
- 集計クエリは SQL 側で完結させる（JS 側で全件ループしない）

### 7.3 データ保全
- 端末機種変更でデータが消えるリスクがあるため、将来的に JSON エクスポート / インポートを実装する
- MVP では CSV エクスポート（Pro）のみでも可

---

## 8. App Store 審査対策

- **年齢レーティング 17+**（アルコール関連）を想定して申請する
- 飲酒を推奨する表現は使わない。目的は「支出管理」であることを一貫させる
- 設定画面に飲酒に関する注意喚起（厚生労働省のガイドライン等）へのリンクを設置する
- 「購入を復元」ボタンの実装漏れに注意
- スクリーンショットに実在の店名・個人名を映さない

---

## 9. 開発の優先順位

### Phase 1（MVP）
1. DB スキーマとマイグレーション基盤
2. 記録の CRUD
3. ホーム（合計 / 予算残 / ペース予測）
4. 履歴一覧
5. 予算設定

### Phase 2
6. 同行者機能（入力・候補プルダウン）
7. 人別集計
8. 月次サマリーグラフ
9. プリセット機能

### Phase 3
10. RevenueCat 導入 / Paywall
11. 無料版の機能制限
12. 年次サマリー
13. CSV エクスポート
14. 同行者管理（統合機能）

### Phase 4
15. EAS Build（production）
16. TestFlight 検証
17. Sandbox で課金・復元テスト
18. App Store 提出

---

## 10. 未決定事項

- アイコン / カラーテーマ
- プリセットの初期値
- 「貯金換算」の換算対象（何に例えるか）
- 通知機能の有無（週次リマインド等）
