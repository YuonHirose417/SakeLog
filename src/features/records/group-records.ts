import type { SpendingRecordWithCompanions } from '@/types/record';

export type RecordSection = {
  /** 'YYYY-MM-DD' */
  date: string;
  /** その日の小計（このページに含まれる行の合計）。 */
  dayTotal: number;
  data: SpendingRecordWithCompanions[];
};

/**
 * 記録を日別のセクションに畳む（要件定義 §6.2「日付降順のリスト、日別グルーピング」）。
 *
 * これは**取得済みのページに対する表示上の整形**であり、集計クエリではない。
 * 月次合計などの集計は従来どおり SQL 側で完結させる（CLAUDE.md §6）。
 * dayTotal も渡された配列の中だけの小計なので、ページ境界で日がまたがると
 * その日の一部だけの合計になりうる（呼び出し側は日単位でページを切るか、
 * 見出しを純粋なラベルとして扱うこと）。
 */
export function groupRecordsByDate(
  records: readonly SpendingRecordWithCompanions[],
): RecordSection[] {
  const sections = new Map<string, RecordSection>();

  for (const record of records) {
    const date = record.spentAt.slice(0, 10);
    const section = sections.get(date);

    if (section === undefined) {
      sections.set(date, { date, dayTotal: record.amount, data: [record] });
      continue;
    }

    section.dayTotal += record.amount;
    section.data.push(record);
  }

  // 入力が日付降順で来る前提だが、順序に依存しないよう明示的に並べ替える
  return [...sections.values()].sort((a, b) => b.date.localeCompare(a.date));
}
