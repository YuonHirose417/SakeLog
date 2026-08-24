import type { Category, DrinkType } from '@/types/record';

/**
 * カテゴリ・酒種の表示ラベル。
 * 記録画面だけでなく履歴・分析でも使うため、特定の feature ではなく lib に置く
 * （feature 間の直接 import を避ける — CLAUDE.md §3）。
 */

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  convenience: 'コンビニ',
  supermarket: 'スーパー',
  bar: '外飲み',
  other: 'その他',
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

/** 記録画面のカテゴリ4択。並び順は要件定義 §4.1 に合わせる。 */
export const CATEGORY_OPTIONS: readonly Option<Category>[] = [
  { value: 'convenience', label: CATEGORY_LABELS.convenience },
  { value: 'supermarket', label: CATEGORY_LABELS.supermarket },
  { value: 'bar', label: CATEGORY_LABELS.bar },
  { value: 'other', label: CATEGORY_LABELS.other },
];

export const DRINK_TYPE_OPTIONS: readonly Option<DrinkType>[] = [
  { value: 'beer', label: DRINK_TYPE_LABELS.beer },
  { value: 'sake', label: DRINK_TYPE_LABELS.sake },
  { value: 'wine', label: DRINK_TYPE_LABELS.wine },
  { value: 'highball', label: DRINK_TYPE_LABELS.highball },
  { value: 'other', label: DRINK_TYPE_LABELS.other },
];
