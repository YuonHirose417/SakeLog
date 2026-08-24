import { create } from 'zustand';

/**
 * アプリ全体で共有する状態（CLAUDE.md §5）。
 *
 * ここに置くのは再取得トリガーだけ。
 * - 集計結果はキャッシュしない。真実の源は常に SQLite で、数字は毎回引き直す
 * - 画面固有の状態（入力中の値・開閉状態など）は各画面の useState に置く
 * - isPro は課金機能（Phase 3）で追加する
 */
type AppState = {
  /** 記録の追加・編集・削除、予算の更新でインクリメントする。 */
  dataRevision: number;
  bumpDataRevision: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  dataRevision: 0,
  bumpDataRevision: () => set((state) => ({ dataRevision: state.dataRevision + 1 })),
}));

/** 再取得トリガーの現在値。hooks の useEffect 依存配列に入れて使う。 */
export function useDataRevision(): number {
  return useAppStore((state) => state.dataRevision);
}

/** DB を更新したあとに呼んで、購読側の再クエリを促す。 */
export function useBumpDataRevision(): () => void {
  return useAppStore((state) => state.bumpDataRevision);
}
