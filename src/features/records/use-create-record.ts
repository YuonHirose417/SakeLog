import { useCallback, useState } from 'react';

import { createRecord, deleteRecord } from '@/repositories/record-repository';

import { useBumpDataRevision } from '@/store/use-app-store';

import type { SpendingRecordInput } from '@/types/record';

type UseCreateRecordResult = {
  /** 保存して、作成された記録の id を返す。失敗したら null。 */
  save: (input: SpendingRecordInput) => Promise<number | null>;
  /** 直前の保存を取り消す（トーストの「取り消す」から呼ぶ）。 */
  undo: (id: number) => Promise<void>;
  saving: boolean;
  error: string | null;
};

/**
 * 記録の作成と取り消しをまとめた hook。
 * 画面はここだけを呼び、リポジトリや expo-sqlite に直接触れない（CLAUDE.md §3 / §6）。
 *
 * DB を更新したら必ず再取得トリガーを進める。これによりホーム等の数字が引き直される（CLAUDE.md §5）。
 */
export function useCreateRecord(): UseCreateRecordResult {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bumpDataRevision = useBumpDataRevision();

  const save = useCallback(
    async (input: SpendingRecordInput): Promise<number | null> => {
      setSaving(true);
      setError(null);

      try {
        const id = await createRecord(input);
        bumpDataRevision();

        return id;
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '保存に失敗しました');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [bumpDataRevision],
  );

  const undo = useCallback(
    async (id: number): Promise<void> => {
      try {
        await deleteRecord(id);
        bumpDataRevision();
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '取り消しに失敗しました');
      }
    },
    [bumpDataRevision],
  );

  return { save, undo, saving, error };
}
