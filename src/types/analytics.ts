import type { Category } from '@/types/record';

/** 月次サマリー（要件定義 §4.4）。記録が0件の月は合計・件数ともに 0 を返す。 */
export type MonthlySummary = {
  /** 'YYYY-MM' */
  month: string;
  totalAmount: number;
  recordCount: number;
  /** 宅飲み（convenience + supermarket）の合計 */
  homeAmount: number;
  /** 外飲み（bar）の合計 */
  outAmount: number;
};

/** カテゴリ別内訳。記録のあるカテゴリのみ返す。 */
export type CategoryBreakdown = {
  category: Category;
  totalAmount: number;
  recordCount: number;
};

/**
 * 人別集計の1行（要件定義 §4.4）。
 * totalAmount は「その人と飲んだ日の自分の支出合計」であり、頭割りはしない。
 * そのため全員分を足しても総支出とは一致しない。
 */
export type CompanionStat = {
  companionId: number;
  name: string;
  /** 一緒に飲んだ記録の件数。平均額の誤解を防ぐため必ず併記する。 */
  visitCount: number;
  totalAmount: number;
  avgAmount: number;
};

/** 特定の同行者の月別推移。 */
export type CompanionTrendPoint = {
  /** 'YYYY-MM' */
  month: string;
  visitCount: number;
  totalAmount: number;
};

/** 人別ランキングの並び替え軸（要件定義 §4.4「表示ルール」）。 */
export type CompanionSortKey = 'total' | 'average';

/** 年次サマリー（Pro 機能）。 */
export type YearlySummary = {
  /** 'YYYY' */
  year: string;
  totalAmount: number;
  recordCount: number;
  /** 最も回数の多かった相手。同行者の記録がなければ null。 */
  mostFrequentCompanion: CompanionStat | null;
  /** 最も高くついた相手。同行者の記録がなければ null。 */
  mostExpensiveCompanion: CompanionStat | null;
};
