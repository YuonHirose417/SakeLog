import { useCallback, useEffect, useState } from 'react';

import {
  countRecordsBeforeMonth,
  deleteRecord,
  findRecentRecords,
} from '@/repositories/record-repository';

import { freeHistoryCutoffMonth } from '@/features/billing/plan-limits';
import { groupRecordsByDate } from '@/features/records/group-records';
import { restoreRecord } from '@/features/records/use-edit-record';
import type { RecordSection } from '@/features/records/group-records';

import { useDataRevision, useBumpDataRevision, useIsPro } from '@/store/use-app-store';

import { toMonthKey } from '@/lib/datetime';

import type { SpendingRecordWithCompanions } from '@/types/record';

const PAGE_SIZE = 50;

type UseRecordListResult = {
  sections: RecordSection[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  /** 無料版で隠れている古い記録の件数。0 ならロック行を出さない。 */
  lockedOlderCount: number;
  /** 1件削除する。復元に使うスナップショットを返す。 */
  remove: (record: SpendingRecordWithCompanions) => Promise<boolean>;
  /** 削除を取り消して作り直す。 */
  restore: (record: SpendingRecordWithCompanions) => Promise<void>;
};

/**
 * 履歴一覧。日付降順で取得し、末尾に達したら追加読み込みする。
 * `dataRevision` を購読しているので、記録の作成・編集・削除で自動的に引き直される。
 *
 * 無料版は直近3ヶ月までしか読み込まない（要件定義 §5.2）。
 * 制限がかかるのは**閲覧だけ**で、記録の作成・編集・削除は無料でも無制限。
 */
export function useRecordList(): UseRecordListResult {
  const dataRevision = useDataRevision();
  const bumpDataRevision = useBumpDataRevision();
  const isPro = useIsPro();

  // 無料版は直近3ヶ月のみ。Pro は undefined（＝全期間）
  const sinceMonth = isPro ? undefined : freeHistoryCutoffMonth(toMonthKey(new Date()));
  const [lockedOlderCount, setLockedOlderCount] = useState(0);

  const [records, setRecords] = useState<SpendingRecordWithCompanions[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 読み込み位置。どの dataRevision に対するページかを一緒に持つ。 */
  const [cursor, setCursor] = useState({ revision: dataRevision, page: 0 });

  // dataRevision が変わったら先頭ページから取り直す。
  // effect ではなくレンダー中に調整することで、古いページを一度読んでから
  // 0 ページ目を読み直す二度手間（カスケードレンダー）を避ける。
  if (cursor.revision !== dataRevision) {
    setCursor({ revision: dataRevision, page: 0 });
  }

  const page = cursor.page;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (page === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        const rows = await findRecentRecords(PAGE_SIZE, page * PAGE_SIZE, sinceMonth);

        if (cancelled) {
          return;
        }

        setRecords((previous) => (page === 0 ? rows : [...previous, ...rows]));
        setHasMore(rows.length === PAGE_SIZE);

        // 無料版のときだけ、隠れている古い記録の件数を数える
        const hiddenCount =
          sinceMonth === undefined ? 0 : await countRecordsBeforeMonth(sinceMonth);

        if (!cancelled) {
          setLockedOlderCount(hiddenCount);
        }
      } catch (cause: unknown) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : '読み込みに失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, dataRevision, sinceMonth]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    setCursor((current) => ({ ...current, page: current.page + 1 }));
  }, [loading, loadingMore, hasMore]);

  const remove = useCallback(
    async (record: SpendingRecordWithCompanions): Promise<boolean> => {
      try {
        await deleteRecord(record.id);
        bumpDataRevision();

        return true;
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '削除に失敗しました');
        return false;
      }
    },
    [bumpDataRevision],
  );

  const restore = useCallback(
    async (record: SpendingRecordWithCompanions): Promise<void> => {
      try {
        await restoreRecord(record);
        bumpDataRevision();
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '取り消しに失敗しました');
      }
    },
    [bumpDataRevision],
  );

  return {
    sections: groupRecordsByDate(records),
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    lockedOlderCount,
    remove,
    restore,
  };
}
