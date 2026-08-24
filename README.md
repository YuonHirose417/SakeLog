# SakeLog（サケログ）

お酒の支出に特化した家計簿アプリ。完全ローカル・オフライン動作。

- 仕様：[docs/requirements.md](docs/requirements.md)
- 実装規約：[CLAUDE.md](CLAUDE.md)（コードを書く前に必ず読むこと）

現在の状態：**プロジェクト雛形のみ**。タブ4つの空ページまで。DB・状態管理・課金は未着手。

---

## 必要環境（Windows）

| 項目                 | 内容                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| Node.js              | **22.13.0 以上**（または 24 系）を推奨。fnm または nvm-windows で管理 |
| パッケージマネージャ | npm（同梱の `package-lock.json` を使用）                              |
| Git                  | 導入済みであること                                                    |
| EAS CLI              | グローバルインストールしない。`npx eas-cli` で都度実行                |

> **Node のバージョンに注意**
> React Native 0.86 は `node ^20.19.4 || ^22.13.0 || ^24.3.0 || >=25` を要求します。
> 現在の環境は v22.11.0 のため `npm install` 時に `EBADENGINE` 警告が出ます（インストール自体は成功します）。
> 警告を消すには fnm で 22.13 以上に上げてください。
>
> ```powershell
> fnm install 22.13.0
> fnm use 22.13.0
> ```

## セットアップ

```powershell
npm install
```

## 開発サーバの起動

```powershell
npm start
```

QR コードが表示されたら、実機の Expo Go または Development Build アプリで読み取ります。

### Expo Go についての重要な注意

**現時点ではまだ Expo Go で動作します**（ネイティブモジュールを未導入のため）。
ただし要件定義の Phase 1 で `expo-sqlite` を、Phase 3 で `react-native-purchases` を導入した時点で
**Expo Go では一切動かなくなります**（CLAUDE.md §7）。

そのため、**DB 実装に着手する前に Development Build を作成しておくこと**を強く推奨します。

## Development Build の作成

```powershell
npx eas-cli login
npx eas-cli build:configure          # eas.json を生成（初回のみ）
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
```

ビルド完了後、生成された Development Build を実機にインストールし、以降は `npm start` で接続します。

> **`app.json` の `bundleIdentifier` / `package` は `com.yourname.sakelog` というプレースホルダです。**
> EAS ビルドを実行する前に、必ず自分の値に変更してください（RevenueCat の Product ID
> `com.<yourname>.sakelog.pro` と整合させること）。

## npm scripts

| コマンド                          | 内容                            |
| --------------------------------- | ------------------------------- |
| `npm start`                       | 開発サーバ起動                  |
| `npm run android` / `npm run ios` | 各プラットフォームで起動        |
| `npm run typecheck`               | `tsc --noEmit`（strict モード） |
| `npm run lint`                    | ESLint                          |
| `npm run lint:fix`                | ESLint 自動修正                 |
| `npm run format`                  | Prettier で整形                 |
| `npm run format:check`            | 整形漏れの検査                  |

コミット前は `npm run typecheck` と `npm run lint` を通すこと。

## ディレクトリ構成

```
app/                 Expo Router。画面とレイアウトのみ
  (tabs)/            ホーム / 履歴 / 分析 / 設定
src/
  db/                接続・スキーマ・マイグレーション
  repositories/      SQL を書いてよい唯一の場所
  features/          機能ごとのロジックと hooks
  components/        汎用 UI
  store/             Zustand スライス
  lib/               純粋関数（日付・金額フォーマット等）
  types/             共有型
docs/                要件定義書
```

`src/` 配下は空ディレクトリのみ（`.gitkeep`）。詳細なルールは CLAUDE.md を参照。

### `@/` エイリアス

`@/*` は `src/*` を指します。`app/` からもここ経由で参照します。

```ts
import { formatYen } from '@/lib/currency';
```

TypeScript の `paths` と ESLint の import リゾルバの両方に設定済みです。

### ESLint による規約の強制

設定ファイル `eslint.config.js` では、CLAUDE.md の規約のうち次の3点を機械的に検査します。

- **import 順**：React/RN → 外部 → `@/` 内部（db → repositories → features → components → store → lib → types）→ 相対 → 型のみ。グループ間は空行必須
- **`any` 禁止**：`@typescript-eslint/no-explicit-any`
- **DB アクセスの隔離**：`expo-sqlite` の import は `src/db/` と `src/repositories/` 以外で禁止

## トラブルシューティング

| 症状                     | 対処                                               |
| ------------------------ | -------------------------------------------------- |
| バンドルの挙動がおかしい | `npx expo start -c`（キャッシュクリア）            |
| ルートの型が古い         | 開発サーバを再起動（`.expo/types` が再生成される） |
| 依存の不整合が疑わしい   | `npx expo-doctor`                                  |
| `EBADENGINE` 警告        | Node を 22.13 以上に上げる（上記参照）             |
