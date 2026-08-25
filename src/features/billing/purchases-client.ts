import { Platform } from 'react-native';

import Constants from 'expo-constants';
import Purchases from 'react-native-purchases';

import { isProActive } from '@/features/billing/entitlements';

import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

/**
 * RevenueCat とのやり取りをここに閉じる。
 * 他のモジュールから react-native-purchases を直接 import しないこと（ESLint で検査）。
 */

/** RevenueCat の Offering / Package 識別子（ダッシュボードの設定と一致させること）。 */
const OFFERING_ID = 'default';
const PACKAGE_ID = '$rc_lifetime';

type RevenueCatConfig = {
  iosApiKey: string;
  androidApiKey: string;
};

/**
 * 実際に使えるキーかどうか。
 *
 * `.env.example` をコピーしただけの状態（`appl_xxxxxxxx...`）を「設定済み」と誤認すると、
 * SDK は初期化されるのに以降の API 呼び出しが全部失敗し、
 * 「価格を取得できませんでした」という分かりにくい表示になる。
 * プレースホルダは未設定として扱い、「設定が未完了」と正しく伝える。
 */
export function isUsableApiKey(key: string): boolean {
  const trimmed = key.trim();

  if (trimmed.length === 0) {
    return false;
  }

  // .env.example のプレースホルダ（xxxx の羅列）を弾く
  if (/x{4,}/i.test(trimmed)) {
    return false;
  }

  // 接頭辞だけで実体が無いものも未設定扱い
  return trimmed !== 'appl_' && trimmed !== 'goog_';
}

function readApiKey(): string {
  const extra = Constants.expoConfig?.extra;
  const config: unknown = extra === undefined ? undefined : extra['revenueCat'];

  if (config === undefined || config === null || typeof config !== 'object') {
    return '';
  }

  const keys = config as Partial<RevenueCatConfig>;
  const key = (Platform.OS === 'ios' ? keys.iosApiKey : keys.androidApiKey) ?? '';

  return isUsableApiKey(key) ? key : '';
}

let configured = false;

/**
 * SDK を一度だけ初期化する。
 *
 * API キーが未設定のときは初期化せず false を返す。
 * キーを入れる前でもアプリが起動できるようにするため、ここで例外を投げないこと。
 */
export function configurePurchases(): boolean {
  if (configured) {
    return true;
  }

  const apiKey = readApiKey();

  if (apiKey.length === 0) {
    return false;
  }

  Purchases.configure({ apiKey });
  configured = true;

  return true;
}

/** 初期化済みか（＝課金機能が使えるか）。 */
export function isPurchasesConfigured(): boolean {
  return configured;
}

/** 起動時に一度だけ呼ぶ。以降は購読で更新するので、繰り返し呼ばないこと。 */
export async function fetchIsPro(): Promise<boolean> {
  if (!configured) {
    return false;
  }

  const info = await Purchases.getCustomerInfo();

  return isProActive(info);
}

/**
 * 購入状態の変化を購読する。
 * 購入・復元のたびに呼ばれるので、getCustomerInfo を都度叩く必要がない。
 */
export function subscribeToProStatus(onChange: (isPro: boolean) => void): void {
  if (!configured) {
    return;
  }

  Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
    onChange(isProActive(info));
  });
}

/** Paywall に出す買い切りパッケージ。取得できなければ null。 */
export async function fetchProPackage(): Promise<PurchasesPackage | null> {
  if (!configured) {
    return null;
  }

  const offerings: PurchasesOfferings = await Purchases.getOfferings();
  const offering = offerings.all[OFFERING_ID] ?? offerings.current;

  if (offering === null || offering === undefined) {
    return null;
  }

  const target = offering.availablePackages.find((item) => item.identifier === PACKAGE_ID);

  return target ?? offering.availablePackages[0] ?? null;
}

/** 購入する。戻り値は購入後の Pro 状態。 */
export async function purchaseProPackage(target: PurchasesPackage): Promise<boolean> {
  const result = await Purchases.purchasePackage(target);

  return isProActive(result.customerInfo);
}

/** 購入を復元する。戻り値は復元後の Pro 状態。 */
export async function restorePurchases(): Promise<boolean> {
  if (!configured) {
    return false;
  }

  const info = await Purchases.restorePurchases();

  return isProActive(info);
}

/** ユーザーが購入をキャンセルしたかどうか。エラー表示を出し分けるために使う。 */
export function isUserCancelled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return 'userCancelled' in error && error.userCancelled === true;
}
