import { useCallback, useEffect, useState } from 'react';

import {
  fetchProPackage,
  isPurchasesConfigured,
  isUserCancelled,
  purchaseProPackage,
  restorePurchases,
} from '@/features/billing/purchases-client';

import { useSetIsPro } from '@/store/use-app-store';

import type { PurchasesPackage } from 'react-native-purchases';

export type RestoreOutcome = 'restored' | 'not-found' | 'error';

type UsePaywallResult = {
  /** ストアから取得した価格表示（'¥480' など）。取得できなければ null。 */
  priceLabel: string | null;
  loading: boolean;
  /** 購入・復元の実行中。 */
  processing: boolean;
  /** API キー未設定などで課金が使えない場合は false。 */
  available: boolean;
  error: string | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<RestoreOutcome>;
};

/**
 * Paywall 用の hook（要件定義 §5.4 / §5.5）。
 * 価格はストアから取得した値をそのまま出す（ハードコードしない）。
 */
export function usePaywall(): UsePaywallResult {
  const setIsPro = useSetIsPro();
  const [target, setTarget] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = isPurchasesConfigured();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const found = await fetchProPackage();

        if (!cancelled) {
          setTarget(found);
        }
      } catch {
        if (!cancelled) {
          setTarget(null);
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
  }, []);

  const purchase = useCallback(async (): Promise<boolean> => {
    if (target === null) {
      return false;
    }

    setProcessing(true);
    setError(null);

    try {
      const purchased = await purchaseProPackage(target);
      setIsPro(purchased);

      return purchased;
    } catch (cause: unknown) {
      // ユーザーが自分でキャンセルした場合はエラー表示しない
      if (!isUserCancelled(cause)) {
        setError('購入を完了できませんでした。時間をおいて試してください。');
      }

      return false;
    } finally {
      setProcessing(false);
    }
  }, [target, setIsPro]);

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    setProcessing(true);
    setError(null);

    try {
      const restored = await restorePurchases();
      setIsPro(restored);

      return restored ? 'restored' : 'not-found';
    } catch {
      setError('復元に失敗しました。通信状況を確認してください。');
      return 'error';
    } finally {
      setProcessing(false);
    }
  }, [setIsPro]);

  return {
    priceLabel: target?.product.priceString ?? null,
    loading,
    processing,
    available,
    error,
    purchase,
    restore,
  };
}
