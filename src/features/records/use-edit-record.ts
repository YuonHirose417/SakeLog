import { useCallback, useEffect, useState } from 'react';

import {
  createRecord,
  deleteRecord,
  findRecordById,
  updateRecord,
} from '@/repositories/record-repository';

import { useBumpDataRevision, useDataRevision } from '@/store/use-app-store';

import type { SpendingRecordInput, SpendingRecordWithCompanions } from '@/types/record';

type UseEditRecordResult = {
  record: SpendingRecordWithCompanions | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  update: (input: SpendingRecordInput) => Promise<boolean>;
  remove: () => Promise<boolean>;
};

/**
 * 1件の記録の読み込み・更新・削除。
 * DB を更新したら必ず再取得トリガーを進め、ホームや履歴の数字を引き直させる（CLAUDE.md §5）。
 */
export function useEditRecord(id: number): UseEditRecordResult {
  const dataRevision = useDataRevision();
  const bumpDataRevision = useBumpDataRevision();

  const [record, setRecord] = useState<SpendingRecordWithCompanions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const found = await findRecordById(id);

        if (!cancelled) {
          setRecord(found);
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
  }, [id, dataRevision]);

  const update = useCallback(
    async (input: SpendingRecordInput): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        await updateRecord(id, input);
        bumpDataRevision();

        return true;
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '保存に失敗しました');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [id, bumpDataRevision],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);

    try {
      await deleteRecord(id);
      bumpDataRevision();

      return true;
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : '削除に失敗しました');
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, bumpDataRevision]);

  return { record, loading, saving, error, update, remove };
}

/**
 * 削除した記録を復元する（トーストの「取り消す」用）。
 *
 * deleteRecord は物理削除なので、控えておいた内容から作り直す。
 * そのため **id は新しくなり、created_at も復元時刻になる**。
 * 同行者は名前で渡し直すので紐づけは維持される。
 */
export function toRestoreInput(record: SpendingRecordWithCompanions): SpendingRecordInput {
  return {
    amount: record.amount,
    category: record.category,
    drinkType: record.drinkType,
    isSolo: record.isSolo,
    memo: record.memo,
    spentAt: record.spentAt,
    companionNames: record.companions.map((companion) => companion.name),
  };
}

/** 削除を取り消して記録を作り直す。 */
export async function restoreRecord(record: SpendingRecordWithCompanions): Promise<number> {
  return createRecord(toRestoreInput(record));
}
