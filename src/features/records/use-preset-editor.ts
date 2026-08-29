import { useCallback, useState } from 'react';

import { createPreset, deletePreset, updatePreset } from '@/repositories/preset-repository';

import { useBumpDataRevision } from '@/store/use-app-store';

import type { Preset, PresetInput } from '@/types/preset';

type UsePresetEditorResult = {
  create: (input: PresetInput) => Promise<boolean>;
  update: (id: number, input: PresetInput) => Promise<boolean>;
  remove: (preset: Preset) => Promise<boolean>;
  /** 削除を取り消して作り直す。 */
  restore: (preset: Preset) => Promise<void>;
  saving: boolean;
  error: string | null;
};

/**
 * プリセットの追加・編集・削除。
 *
 * DB を更新したら必ず再取得トリガーを進める。
 * これでホームのプリセットボタン（usePresets が購読）が即座に更新される（CLAUDE.md §5）。
 */
export function usePresetEditor(): UsePresetEditorResult {
  const bumpDataRevision = useBumpDataRevision();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (input: PresetInput): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        await createPreset(input);
        bumpDataRevision();

        return true;
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '保存に失敗しました');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [bumpDataRevision],
  );

  const update = useCallback(
    async (id: number, input: PresetInput): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        await updatePreset(id, input);
        bumpDataRevision();

        return true;
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '保存に失敗しました');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [bumpDataRevision],
  );

  const remove = useCallback(
    async (preset: Preset): Promise<boolean> => {
      setError(null);

      try {
        await deletePreset(preset.id);
        bumpDataRevision();

        return true;
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '削除に失敗しました');
        return false;
      }
    },
    [bumpDataRevision],
  );

  /**
   * 削除の取り消し。
   *
   * deletePreset は物理削除なので、控えておいた内容から作り直す。
   * sortOrder を渡せるので**元の並び位置は保たれる**（記録の復元と違って末尾に飛ばない）。
   * ただし id は新しく採番される。
   */
  const restore = useCallback(
    async (preset: Preset): Promise<void> => {
      try {
        await createPreset({
          label: preset.label,
          amount: preset.amount,
          category: preset.category,
          drinkType: preset.drinkType,
          sortOrder: preset.sortOrder,
        });
        bumpDataRevision();
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '取り消しに失敗しました');
      }
    },
    [bumpDataRevision],
  );

  return { create, update, remove, restore, saving, error };
}
