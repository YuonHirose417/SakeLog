import type { Category, DrinkType } from '@/types/record';

/**
 * カテゴリ・酒種の表示ラベル。
 * 記録画面だけでなく履歴・分析でも使うため、特定の feature ではなく lib に置く
 * （feature 間の直接 import を避ける — CLAUDE.md §3）。
 */

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  home: '宅飲み',
  out: '外飲み',
};

export const DRINK_TYPE_LABELS: Readonly<Record<DrinkType, string>> = {
  beer: 'ビール',
  sake: '日本酒',
  wine: 'ワイン',
  highball: 'ハイボール',
  other: 'その他',
};

export type Option<T> = {
  value: T;
  label: string;
};

/** 記録画面のカテゴリ2択（要件定義 §4.1）。 */
export const CATEGORY_OPTIONS: readonly Option<Category>[] = [
  { value: 'home', label: CATEGORY_LABELS.home },
  { value: 'out', label: CATEGORY_LABELS.out },
];

export const DRINK_TYPE_OPTIONS: readonly Option<DrinkType>[] = [
  { value: 'beer', label: DRINK_TYPE_LABELS.beer },
  { value: 'sake', label: DRINK_TYPE_LABELS.sake },
  { value: 'wine', label: DRINK_TYPE_LABELS.wine },
  { value: 'highball', label: DRINK_TYPE_LABELS.highball },
  { value: 'other', label: DRINK_TYPE_LABELS.other },
];
