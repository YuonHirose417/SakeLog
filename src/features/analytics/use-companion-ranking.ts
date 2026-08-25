import { useEffect, useState } from 'react';

import { findCompanionRanking } from '@/repositories/analytics-repository';

import { useDataRevision } from '@/store/use-app-store';

import type { CompanionSortKey, CompanionStat } from '@/types/analytics';

/** 「3回以上」フィルタの閾値（要件定義 §4.4）。 */
export const MIN_VISITS_THRESHOLD = 3;

type UseCompanionRankingResult = {
  stats: CompanionStat[];
  loading: boolean;
  error: string | null;
};

/**
 * 人別集計（要件定義 §4.4）。
 *
 * 並び替えは sortKey をリポジトリにそのまま渡し、UI 側では並べ替えない
 * （ORDER BY はリポジトリの固定ルックアップ表が担当する）。
 *
 * 金額は頭割りせず、1件の記録金額を紐づく全同行者に丸ごと計上した値が返る。
 * そのため全員分を合計しても総支出とは一致しない。画面に注記を出すこと。
 *
 * limit は渡さない（無料版の上位3人制限は Phase 3 で課金機能と一緒に入れる）。
 */
export function useCompanionRanking(
  month: string,
  sortKey: CompanionSortKey,
  minVisitsOnly: boolean,
): UseCompanionRankingResult {
  const dataRevision = useDataRevision();
  const [stats, setStats] = useState<CompanionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const rows = await findCompanionRanking(month, {
          sortKey,
          minVisits: minVisitsOnly ? MIN_VISITS_THRESHOLD : 1,
        });

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
  }, [month, sortKey, minVisitsOnly, dataRevision]);

  return { stats, loading, error };
}
