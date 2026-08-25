import { create } from 'zustand';

/**
 * アプリ全体で共有する状態（CLAUDE.md §5）。
 *
 * ここに置くのは再取得トリガーと isPro だけ。
 * - 集計結果はキャッシュしない。真実の源は常に SQLite で、数字は毎回引き直す
 * - 画面固有の状態（入力中の値・開閉状態など）は各画面の useState に置く
 * - isPro は起動時に一度だけ取得し、以降は RevenueCat の購読で更新する（毎回問い合わせない）
 */
type AppState = {
  /** 記録の追加・編集・削除、予算の更新でインクリメントする。 */
  dataRevision: number;
  bumpDataRevision: () => void;
  /** Pro（買い切り）が有効かどうか。 */
  isPro: boolean;
  setIsPro: (value: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  dataRevision: 0,
  bumpDataRevision: () => set((state) => ({ dataRevision: state.dataRevision + 1 })),
  isPro: false,
  setIsPro: (value) => set({ isPro: value }),
}));

/** Pro が有効かどうか。無料版の制限判定はこれを見る。 */
export function useIsPro(): boolean {
  return useAppStore((state) => state.isPro);
}

/** 購入・復元の結果を反映する。 */
export function useSetIsPro(): (value: boolean) => void {
  return useAppStore((state) => state.setIsPro);
}

/** 再取得トリガーの現在値。hooks の useEffect 依存配列に入れて使う。 */
export function useDataRevision(): number {
  return useAppStore((state) => state.dataRevision);
}

/** DB を更新したあとに呼んで、購読側の再クエリを促す。 */
export function useBumpDataRevision(): () => void {
  return useAppStore((state) => state.bumpDataRevision);
}
