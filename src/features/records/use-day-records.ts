import { useEffect, useState } from 'react';

import { findRecordsByDate } from '@/repositories/record-repository';

import { useDataRevision } from '@/store/use-app-store';

import type { SpendingRecordWithCompanions } from '@/types/record';

type UseDayRecordsResult = {
  records: SpendingRecordWithCompanions[];
  loading: boolean;
};

const EMPTY: SpendingRecordWithCompanions[] = [];

/**
 * カレンダーで選んだ日の記録。
 * date が null（未選択）のときは何も取得しない。
 *
 * 取得済みの日付を state に持ち、返す値は「選択中の日付と一致するときだけ」中身を出す。
 * こうすると、日を切り替えた直後に前の日の記録が一瞬表示されるのを防げる。
 */
export function useDayRecords(date: string | null): UseDayRecordsResult {
  const dataRevision = useDataRevision();
  const [loaded, setLoaded] = useState<{
    date: string | null;
    records: SpendingRecordWithCompanions[];
  }>({ date: null, records: EMPTY });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (date === null) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const rows = await findRecordsByDate(date);

        if (!cancelled) {
          setLoaded({ date, records: rows });
        }
      } catch {
        if (!cancelled) {
          setLoaded({ date, records: EMPTY });
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
  }, [date, dataRevision]);

  return {
    records: date !== null && loaded.date === date ? loaded.records : EMPTY,
    loading,
  };
}
