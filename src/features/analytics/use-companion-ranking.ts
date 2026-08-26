import { useEffect, useState } from 'react';

import {
  findCompanionRanking,
  findCompanionRankingByYear,
} from '@/repositories/analytics-repository';

import { splitRankingForPlan } from '@/features/billing/plan-limits';

import { useDataRevision, useIsPro } from '@/store/use-app-store';

import type { CompanionSortKey, CompanionStat } from '@/types/analytics';

/** 「3回以上」フィルタの閾値（要件定義 §4.4）。 */
export const MIN_VISITS_THRESHOLD = 3;

/** 集計対象の範囲。月次タブと年次タブで同じカードを使い回すための識別子。 */
export type AnalyticsScope = { type: 'month'; key: string } | { type: 'year'; key: string };

type UseCompanionRankingOptions = {
  /**
   * 取得件数の上限。
   * Phase 3 の無料版制限（人別集計は上位3人まで）はここに値を渡して実現する。
   * 今回は渡さないので全件返る。
   */
  limit?: number;
};

type UseCompanionRankingResult = {
  /** 実際に表示する行。無料版は上位3人まで。 */
  stats: CompanionStat[];
  /** 無料版で隠れている人数。0 ならロック表示を出さない。 */
  lockedCount: number;
  loading: boolean;
  error: string | null;
};

/**
 * 人別集計（要件定義 §4.4）。月次・年次の両方で使う。
 *
 * 並び替えは sortKey をリポジトリにそのまま渡し、UI 側では並べ替えない
 * （ORDER BY はリポジトリの固定ルックアップ表が担当する）。
 *
 * 金額は頭割りせず、1件の記録金額を紐づく全同行者に丸ごと計上した値が返る。
 * そのため全員分を合計しても総支出とは一致しない。画面に注記を出すこと。
 */
export function useCompanionRanking(
  scope: AnalyticsScope,
  sortKey: CompanionSortKey,
  minVisitsOnly: boolean,
  options: UseCompanionRankingOptions = {},
): UseCompanionRankingResult {
  const dataRevision = useDataRevision();
  const isPro = useIsPro();
  const [stats, setStats] = useState<CompanionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scopeType = scope.type;
  const scopeKey = scope.key;
  const { limit } = options;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const queryOptions = {
        sortKey,
        minVisits: minVisitsOnly ? MIN_VISITS_THRESHOLD : 1,
        limit,
      };

      try {
        const rows =
          scopeType === 'year'
            ? await findCompanionRankingByYear(scopeKey, queryOptions)
            : await findCompanionRanking(scopeKey, queryOptions);

        if (!cancelled) {
          setStats(rows);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '読み込みに失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [scopeType, scopeKey, sortKey, minVisitsOnly, limit, dataRevision]);

  // 無料版は上位3人まで。「他 N 人」を出すため総数が必要なので、SQL の LIMIT ではなくここで切る
  const { visible, lockedCount } = splitRankingForPlan(stats, isPro);

  return { stats: visible, lockedCount, loading, error };
}
