// CLAUDE.md の規約を機械的に担保するための ESLint 設定（フラット構成）
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'expo-env.d.ts', '.expo-shared/**'],
  },

  ...expoConfig,

  {
    // tsconfig の paths（@/* → src/*）を import プラグインにも解決させる
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'] },
      },
    },
  },

  {
    rules: {
      // CLAUDE.md §4「import 順」
      // React/RN → 外部 → @/ 内部（db → repositories → features → components → store → lib → types）
      // → 相対 → 型のみ。グループ間は空行で区切る。
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'react-native', group: 'external', position: 'before' },
            { pattern: '@/db/**', group: 'internal', position: 'before' },
            { pattern: '@/repositories/**', group: 'internal', position: 'before' },
            { pattern: '@/features/**', group: 'internal', position: 'before' },
            { pattern: '@/components/**', group: 'internal', position: 'before' },
            { pattern: '@/store/**', group: 'internal', position: 'before' },
            { pattern: '@/lib/**', group: 'internal', position: 'before' },
            { pattern: '@/types/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'react-native'],
          'newlines-between': 'always',
        },
      ],
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // CLAUDE.md §4「型」: any 禁止
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  {
    // CLAUDE.md §6「SQL を書いてよいのは src/repositories/ のみ」
    // expo-sqlite の直接 import を DB 層の外で禁止する（下のオーバーライドで解除）
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-sqlite',
              message: 'DB アクセスは src/repositories/ 経由にしてください（CLAUDE.md §6）。',
            },
          ],
          patterns: [
            {
              group: ['expo-sqlite/*'],
              message: 'DB アクセスは src/repositories/ 経由にしてください（CLAUDE.md §6）。',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/db/**/*.{ts,tsx}', 'src/repositories/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },

  // Prettier と競合する整形系ルールを最後に無効化する
  prettierConfig,
]);
