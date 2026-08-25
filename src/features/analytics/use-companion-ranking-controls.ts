import { useCallback, useState } from 'react';

import type { CompanionSortKey } from '@/types/analytics';

type UseCompanionRankingControlsResult = {
  sortKey: CompanionSortKey;
  minVisitsOnly: boolean;
  setSortKey: (key: CompanionSortKey) => void;
  setMinVisitsOnly: (value: boolean) => void;
};

/**
 * 人別集計の並び替えとフィルタの状態（要件定義 §4.4 の表示ルール）。
 *
 * 平均額ソートでは「3回以上」フィルタを既定 ON にする
 * （1回だけの相手が平均額トップに来る誤解を防ぐため）。
 * ただし利用者が自分でトグルした後は、その意思を尊重して自動で上書きしない。
 *
 * 月次タブ・年次タブでそれぞれ独立したインスタンスを持たせる
 * （片方の操作がもう片方に漏れないようにするため）。
 */
export function useCompanionRankingControls(): UseCompanionRankingControlsResult {
  const [sortKey, setSortKeyState] = useState<CompanionSortKey>('total');
  const [minVisitsOnly, setMinVisitsOnlyState] = useState(false);
  // 利用者がフィルタを手で触ったかどうか
  const [filterTouched, setFilterTouched] = useState(false);

  const setSortKey = useCallback(
    (next: CompanionSortKey) => {
      // Phase 3: 平均単価ソートは Pro 限定なので、ここで判定を挟む
      setSortKeyState(next);

      if (!filterTouched) {
        setMinVisitsOnlyState(next === 'average');
      }
    },
    [filterTouched],
  );

  const setMinVisitsOnly = useCallback((next: boolean) => {
    setMinVisitsOnlyState(next);
    setFilterTouched(true);
  }, []);

  return { sortKey, minVisitsOnly, setSortKey, setMinVisitsOnly };
}
