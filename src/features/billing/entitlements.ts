/**
 * Entitlement の判定。
 *
 * 将来 Entitlement を増やせるよう、id を引数に取る形にしている（要件定義 §5.6）。
 * react-native-purchases に依存しない純粋関数なので、単体で検証できる。
 */

/** 買い切り Pro の Entitlement 識別子（RevenueCat 側の設定と一致させること）。 */
export const ENTITLEMENT_PRO = 'pro';

/** 判定に必要な最小限の形。CustomerInfo の一部だけを受け取る。 */
export type EntitlementSource = {
  entitlements: {
    active: Record<string, unknown>;
  };
};

/** 指定した Entitlement が有効かどうか。 */
export function hasEntitlement(info: EntitlementSource | null, id: string): boolean {
  if (info === null) {
    return false;
  }

  return info.entitlements.active[id] !== undefined;
}

/** Pro が有効かどうか。 */
export function isProActive(info: EntitlementSource | null): boolean {
  return hasEntitlement(info, ENTITLEMENT_PRO);
}
