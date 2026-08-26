import { shiftMonth } from '@/lib/datetime';

import type { CompanionStat } from '@/types/analytics';

/**
 * 無料版の制限（要件定義 §5.2）。
 *
 * **記録の登録・編集・削除には制限をかけない。** データが溜まって初めて価値が出るため、
 * ここに記録機能の制限を足さないこと。
 *
 * react-native-purchases に依存しない純粋な定数・関数なので、単体で検証できる。
 */

/** 履歴を閲覧できる月数（今月を含む）。 */
export const FREE_HISTORY_MONTHS = 3;

/** 人別集計で表示できる人数。 */
export const FREE_COMPANION_RANKING_LIMIT = 3;

/**
 * 無料版で閲覧できる最も古い月。
 * 今月を含めて FREE_HISTORY_MONTHS ヶ月なので、今月が 2026-08 なら 2026-06。
 */
export function freeHistoryCutoffMonth(currentMonth: string): string {
  return shiftMonth(currentMonth, -(FREE_HISTORY_MONTHS - 1));
}

export type RankingSplit = {
  /** 実際に表示する行。 */
  visible: CompanionStat[];
  /** 無料版で隠れている人数。0 ならロック表示を出さない。 */
  lockedCount: number;
};

/**
 * 人別集計を、表示分と隠す分に分ける。
 *
 * 「他 N 人」の N を出すには総数が必要なので、SQL の LIMIT ではなくここで切る。
 * ランキングの行数は期間内の同行者数（多くても数十）なので、全件取得のコストは小さい。
 */
export function splitRankingForPlan(stats: readonly CompanionStat[], isPro: boolean): RankingSplit {
  if (isPro || stats.length <= FREE_COMPANION_RANKING_LIMIT) {
    return { visible: [...stats], lockedCount: 0 };
  }

  return {
    visible: stats.slice(0, FREE_COMPANION_RANKING_LIMIT),
    lockedCount: stats.length - FREE_COMPANION_RANKING_LIMIT,
  };
}
