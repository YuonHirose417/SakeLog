/**
 * 日付文字列の変換はここに集約する（CLAUDE.md §4）。
 *
 * 重要な取り決め:
 * records.spent_at は「タイムゾーン指定子を持たないローカル時刻の ISO8601」で保存する
 * （例: '2026-08-01T00:30:00'）。
 * 集計クエリが strftime('%Y-%m', spent_at) で月を切るため、UTC の 'Z' 付き文字列を入れると
 * 日本時間 8/1 0:30 の記録が 7 月に集計されてしまう。これを避けるための取り決め。
 * created_at / updated_at は集計に使わないため UTC のままでよい。
 */

/** 現在時刻の ISO8601 文字列（UTC）。created_at / updated_at に使う。 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Date をローカル時刻の ISO8601 文字列（タイムゾーン指定子なし）に変換する。
 * spent_at にはこの形式を使うこと。
 */
export function toLocalIso(date: Date): string {
  const pad = (value: number): string => `${value}`.padStart(2, '0');

  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

  return `${datePart}T${timePart}`;
}

/** Date から月キー 'YYYY-MM' を作る（ローカル時刻基準）。 */
export function toMonthKey(date: Date): string {
  return toLocalIso(date).slice(0, 7);
}

/** Date から年キー 'YYYY' を作る（ローカル時刻基準）。 */
export function toYearKey(date: Date): string {
  return toLocalIso(date).slice(0, 4);
}

/** spent_at の文字列から月キー 'YYYY-MM' を取り出す。 */
export function monthKeyOf(localIso: string): string {
  return localIso.slice(0, 7);
}

/** spent_at の文字列から年キー 'YYYY' を取り出す。 */
export function yearKeyOf(localIso: string): string {
  return localIso.slice(0, 4);
}
