import type { Category, DrinkType } from '@/types/record';

/** よく買う酒のプリセット。ホームからワンタップで記録するために使う。 */
export type Preset = {
  id: number;
  label: string;
  amount: number;
  category: Category;
  drinkType: DrinkType | null;
  sortOrder: number;
};

/** プリセットの新規作成・更新に渡す入力。 */
export type PresetInput = {
  label: string;
  amount: number;
  category: Category;
  drinkType?: DrinkType | null;
  sortOrder?: number;
};
