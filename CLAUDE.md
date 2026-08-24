# CLAUDE.md — SakeLog

## 1. プロジェクト概要

お酒の支出だけに特化した家計簿アプリ（Expo / React Native、完全ローカル・オフライン）。
差別化の核は「誰と飲んだか」の人別集計。記録は3タップで完了することを最優先する。
詳細仕様は `docs/requirements.md` が唯一のソース。迷ったら必ずそちらを参照する。

## 2. 技術スタックとバージョン方針

| 領域 | 技術 |
|---|---|
| フレームワーク / 言語 | Expo (React Native) / TypeScript |
| ルーティング | Expo Router |
| DB | expo-sqlite（完全ローカル） |
| 状態管理 | Zustand |
| 課金 | RevenueCat (react-native-purchases) |
| ビルド / 配信 | EAS Build / EAS Submit |
| バックエンド | なし |

- 全依存を Expo SDK のメジャーバージョンに追従させる。パッケージの追加・更新は `npx expo install` を使う（ネイティブ系に `npm install` を直打ちしない）
- EAS CLI はグローバル導入せず `npx eas-cli` で都度実行する
- Node は fnm / nvm-windows 管理。開発は **Development Build（実機）前提**

## 3. ディレクトリ構成のルール

```
app/                    Expo Router。画面とレイアウトのみ
  (tabs)/{index,history,analytics,settings}.tsx
  record/{new,[id]}.tsx
  paywall.tsx
  settings/{companions,presets,budget}.tsx
src/
  db/                   接続・スキーマ・マイグレーション
  repositories/         ★SQL を書いてよい唯一の場所
  features/             記録 / 予算 / 分析 / 課金のロジックと hooks
  components/           汎用 UI（機能非依存）
  store/                Zustand スライス
  lib/                  日付・金額フォーマット等の純粋関数
  types/                共有型
docs/requirements.md    要件定義書
```

- `app/` にビジネスロジックを置かない。画面は hooks を呼んで描画するだけ
- `src/features/<機能>/` から他 feature の内部を直接 import しない（共有は `lib` / `components` / `types` 経由）
- import は絶対パス（`@/` エイリアス）を使う

## 4. コーディング規約

**命名**
- コンポーネント・型は PascalCase、変数・関数は camelCase、定数は UPPER_SNAKE_CASE
- ファイル名は kebab-case（コンポーネント定義ファイルのみ PascalCase）
- DB のカラムは snake_case のまま。**リポジトリ層の出口で camelCase に変換する**

**型**
- `any` 禁止。やむを得ない場合は `unknown` + 絞り込み。`as` によるキャストも避ける
- オブジェクト型は `type` を既定とし、宣言マージが要るときだけ `interface`
- カテゴリ・酒種などは union 型で定義し、文字列リテラルを直書きしない
- 公開 API（repository / hooks）の戻り値型は明示する

**import 順**（グループ間は空行で区切る）
1. React / React Native
2. 外部ライブラリ
3. `@/` 内部（db → repositories → features → components → store → lib → types）
4. 相対パス
5. 型のみの import

**その他**
- 金額は常に整数（円）。浮動小数で保持しない
- 日付は ISO8601 文字列で保存。文字列⇔Date の変換は `lib` に集約する

## 5. 状態管理の方針

- Zustand（`src/store/`）に置くのは次の**2つだけ**：
  - `isPro` — 起動時に `Purchases.getCustomerInfo()` で一度取得して保持
  - **再取得トリガー** — 記録の追加・編集・削除、予算更新時にインクリメントし、購読側の hooks が再クエリする
- 画面固有の状態（入力中の金額、選択タブ、ソート条件、モーダル開閉など）は `useState` でローカルに持つ。ストアに上げない
- **集計結果をストアにキャッシュしない。** 月次合計・人別ランキング等は都度 SQLite から取得する（真実の源は常に DB）
- 「ストアを更新して画面を同期させる」のではなく、**DB を更新 → トリガーを進める → hooks が再クエリする** に統一する

## 6. DB アクセスの方針

- **SQL を書いてよいのは `src/repositories/` のみ。** 画面・hooks・store から `expo-sqlite` を直接触らない
- リポジトリは型付きオブジェクトを返す。呼び出し側に SQL 由来の型・行構造を漏らさない
- 接続時に必ず `PRAGMA foreign_keys = ON;` を実行する（SQLite はデフォルト OFF）
- スキーマ変更は `PRAGMA user_version` による前方向マイグレーションのみ。既存マイグレーションは書き換えず追記する
- 集計は SQL 側で完結させる（JS で全件ループして合計しない）。`docs/requirements.md` 4.4 のクエリを出発点にする
- 書き込みはパラメータバインドのみ。文字列連結で SQL を組み立てない
- 複数テーブルにまたがる更新（記録＋同行者の UPSERT、同行者のマージ等）はトランザクションで囲む

## 7. やってはいけないこと

- **Expo Go 前提のコードを書かない。** expo-sqlite / react-native-purchases はネイティブモジュールで Expo Go では動かない。常に Development Build 前提
- **記録機能（登録・編集・削除）に課金制限をかけない。** 制限してよいのは分析・履歴期間・エクスポートのみ
- 起動直後に Paywall モーダルを出さない。導線はロックされた行のタップから
- 「購入を復元」ボタンを設定画面と Paywall の両方から外さない（審査必須）
- ユーザーデータを端末外に送信しない。ネットワーク通信は RevenueCat のみ。解析 SDK・クラッシュレポート等を無断で追加しない
- サーバー / API / 同期機能を勝手に導入しない
- 飲酒を推奨・肯定する文言を UI に書かない（目的は支出管理。年齢レーティング 17+ 前提）
- 同行者の金額を頭割りしない。記録額を全同行者に丸ごと計上し、「※合計は総支出と一致しません」の注記を必ず表示する
- 「一人で飲んだ」を companions に登録しない（`records.is_solo` フラグで管理）
- Bash 経由で日本語文字列・日本語ファイル名を扱わない（この環境では文字化けする）。ファイル作成・編集は Write / Edit ツール、日本語を含む検索は Grep ツールを使う
- リポジトリ層の外に SQL を書かない／集計結果をストアに持たない／`any` を使わない（最重要の再掲）
