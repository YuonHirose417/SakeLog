import { useEffect, useState } from 'react';

import {
  configurePurchases,
  fetchIsPro,
  subscribeToProStatus,
} from '@/features/billing/purchases-client';

import { useSetIsPro } from '@/store/use-app-store';

/**
 * 起動時に課金 SDK を初期化する（要件定義 §5.4）。
 *
 * - configure は一度だけ
 * - `getCustomerInfo()` も**起動時の1回だけ**。以降は購読で更新するので毎回問い合わせない
 * - API キーが未設定なら何もしない（アプリは起動できる。課金だけが無効）
 *
 * ルートレイアウトから1回呼ぶこと。
 */
export function useBillingBootstrap(): { billingAvailable: boolean } {
  const setIsPro = useSetIsPro();
  const [billingAvailable, setBillingAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const available = configurePurchases();

      if (cancelled) {
        return;
      }

      setBillingAvailable(available);

      if (!available) {
        return;
      }

      // 購入・復元の結果はここで拾うので、以降 getCustomerInfo は呼ばない
      subscribeToProStatus((value) => setIsPro(value));

      try {
        const isPro = await fetchIsPro();

        if (!cancelled) {
          setIsPro(isPro);
        }
      } catch {
        // 通信できないときは未購入として扱う。記録機能には影響しない
        if (!cancelled) {
          setIsPro(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setIsPro]);

  return { billingAvailable };
}
