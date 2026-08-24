/** 金額は常に整数（円）で扱う。表示用の変換だけをここに置く（CLAUDE.md §4）。 */

/** 1280 → '1,280' */
export function formatYen(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

/** 1280 → '¥1,280' */
export function formatYenWithSymbol(amount: number): string {
  return `¥${formatYen(amount)}`;
}

/**
 * 入力文字列から数字だけを取り出して整数にする。
 * 全角数字・カンマ・記号を打たれても壊れないようにするための前処理。
 */
export function parseAmountDigits(text: string): number {
  const halfWidth = text.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
  const digits = halfWidth.replace(/\D/g, '');

  if (digits.length === 0) {
    return 0;
  }

  return Number.parseInt(digits, 10);
}
