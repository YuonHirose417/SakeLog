/**
 * 同行者。
 * 「一人で飲んだ」はここには登録せず records.is_solo で管理する（要件定義 §4.2）。
 */
export type Companion = {
  id: number;
  name: string;
  /** 記録に紐づけられた回数。候補の並び替えに使う。 */
  useCount: number;
  /** 直近で一緒に飲んだ日時（ISO8601）。未使用なら null。 */
  lastUsedAt: string | null;
  createdAt: string;
};
