import { useCallback, useEffect, useState } from 'react';

import {
  findBudgetByMonth,
  findEffectiveBudget,
  upsertBudget,
} from '@/repositories/budget-repository';

import { useBumpDataRevision, useDataRevision } from '@/store/use-app-store';

import { toLocalIso } from '@/lib/datetime';

type UseBudgetSettingsResult = {
  /** 対象月 'YYYY-MM' */
  month: string;
  /** この月に明示的に設定された額。未設定なら null。 */
  currentAmount: number | null;
  /** 前月から引き継がれる額。引き継ぎ元も無ければ null。 */
  inheritedAmount: number | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  save: (amount: number) => Promise<boolean>;
};

/**
 * 月予算の設定画面用の hook。
 * 未設定の月は前月の値が引き継がれる（要件定義 §4.3）ため、引き継ぎ値も返して
 * 画面がプレースホルダに出せるようにしている。
 */
export function useBudgetSettings(): UseBudgetSettingsResult {
  const month = toLocalIso(new Date()).slice(0, 7);
  const dataRevision = useDataRevision();
  const bumpDataRevision = useBumpDataRevision();

  const [currentAmount, setCurrentAmount] = useState<number | null>(null);
  const [inheritedAmount, setInheritedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [explicit, effective] = await Promise.all([
          findBudgetByMonth(month),
          findEffectiveBudget(month),
        ]);

        if (cancelled) {
          return;
        }

        setCurrentAmount(explicit?.amount ?? null);
        setInheritedAmount(explicit === null ? (effective?.amount ?? null) : null);
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
  }, [month, dataRevision]);

  const save = useCallback(
    async (amount: number): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        await upsertBudget(month, amount);
        bumpDataRevision();

        return true;
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : '保存に失敗しました');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [month, bumpDataRevision],
  );

  return { month, currentAmount, inheritedAmount, loading, saving, error, save };
}
