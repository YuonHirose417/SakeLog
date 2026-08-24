import type { Companion } from '@/types/companion';

/** 支出カテゴリ。DB では records.category に TEXT で保存する。 */
export type Category = 'convenience' | 'supermarket' | 'bar' | 'other';

/** 酒種。任意項目のため null を取りうる。 */
export type DrinkType = 'beer' | 'sake' | 'wine' | 'highball' | 'other';

/** 宅飲み扱いのカテゴリ（要件定義 §4.4 の宅飲み / 外飲み比率で使う）。 */
export const HOME_CATEGORIES: readonly Category[] = ['convenience', 'supermarket'];

/**
 * 支出記録。
 * TypeScript 組み込みの Record<K, V> と衝突するため SpendingRecord という名前にしている。
 */
export type SpendingRecord = {
  id: number;
  amount: number;
  category: Category;
  drinkType: DrinkType | null;
  /** 一人で飲んだかどうか。DB では 0 / 1 で保持する。 */
  isSolo: boolean;
  memo: string | null;
  /**
   * 支出日時。タイムゾーン指定子を持たないローカル時刻の ISO8601（例 '2026-08-01T00:30:00'）。
   * 集計が strftime で月を切るための取り決め。詳細は @/lib/datetime を参照。
   */
  spentAt: string;
  /** ISO8601（UTC） */
  createdAt: string;
  /** ISO8601（UTC） */
  updatedAt: string;
};

/** 同行者を紐づけた状態の記録。 */
export type SpendingRecordWithCompanions = SpendingRecord & {
  companions: Companion[];
};

/** 記録の新規作成・更新に渡す入力。同行者は名前で受け取り、リポジトリ側で UPSERT する。 */
export type SpendingRecordInput = {
  amount: number;
  category: Category;
  drinkType?: DrinkType | null;
  isSolo?: boolean;
  memo?: string | null;
  /** ローカル時刻の ISO8601（タイムゾーン指定子なし）。@/lib/datetime の toLocalIso で作る。 */
  spentAt: string;
  /** 同行者名。trim 済みでなくてよい（リポジトリ側で trim する）。 */
  companionNames?: readonly string[];
};
