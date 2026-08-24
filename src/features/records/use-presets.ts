import { useEffect, useState } from 'react';

import { findAllPresets } from '@/repositories/preset-repository';

import { useDataRevision } from '@/store/use-app-store';

import type { Preset } from '@/types/preset';

type UsePresetsResult = {
  presets: Preset[];
  loading: boolean;
  error: string | null;
};

/**
 * ホームに並べるプリセットの一覧（要件定義 §4.1 / §6.1）。
 * プリセットの追加・並び替えでも再取得トリガーが進むため、それを購読して引き直す。
 */
export function usePresets(): UsePresetsResult {
  const dataRevision = useDataRevision();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const rows = await findAllPresets();

        if (!cancelled) {
          setPresets(rows);
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
  }, [dataRevision]);

  return { presets, loading, error };
}
