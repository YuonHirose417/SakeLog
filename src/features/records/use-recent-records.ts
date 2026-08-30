import { useEffect, useState } from 'react';

import { findRecentRecords } from '@/repositories/record-repository';

import { useDataRevision } from '@/store/use-app-store';

import type { SpendingRecordWithCompanions } from '@/types/record';

type UseRecentRecordsResult = {
  records: SpendingRecordWithCompanions[];
  loading: boolean;
};

/**
 * ホームに出す直近の記録。
 *
 * `sinceMonth` は渡さない。無料版の「直近3ヶ月まで」は履歴の閲覧範囲の制限であって、
 * 直近数件には影響しないため（3ヶ月以上前の記録しか無い人でも最新5件は見える）。
 *
 * `dataRevision` を購読しているので、記録の追加・編集・削除で自動的に引き直される。
 */
export function useRecentRecords(limit = 5): UseRecentRecordsResult {
  const dataRevision = useDataRevision();
  const [records, setRecords] = useState<SpendingRecordWithCompanions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const rows = await findRecentRecords(limit);

        if (!cancelled) {
          setRecords(rows);
        }
      } catch {
        // ホームの補助的な表示なので、失敗しても他の数字は出せるように黙って空にする
        if (!cancelled) {
          setRecords([]);
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
  }, [limit, dataRevision]);

  return { records, loading };
}
