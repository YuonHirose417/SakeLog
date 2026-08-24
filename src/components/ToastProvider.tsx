import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 「取り消す」のようなアクション付きトーストを表現する。 */
type ToastAction = {
  label: string;
  onPress: () => void;
};

type ToastOptions = {
  message: string;
  action?: ToastAction;
  /** 表示時間（ms）。取り消し操作の猶予を持たせるため既定は長め。 */
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
};

const DEFAULT_DURATION_MS = 5000;

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * アプリ全体で使うトースト基盤。
 * モーダルを閉じた後に呼び出し元の画面の上へ出す必要があるため、ルートに置く。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      clearTimer();
      setToast(options);

      timerRef.current = setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, options.durationMs ?? DEFAULT_DURATION_MS);
    },
    [clearTimer],
  );

  // アンマウント時にタイマーを残さない
  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toast={toast} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error('useToast は ToastProvider の中で使ってください');
  }

  return context;
}

function ToastHost({ toast, onDismiss }: { toast: ToastOptions | null; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();

  if (toast === null) {
    return null;
  }

  return (
    <View style={[styles.host, { bottom: insets.bottom + 24 }]} pointerEvents="box-none">
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>

        {toast.action !== undefined && (
          <Pressable
            onPress={() => {
              onDismiss();
              toast.action?.onPress();
            }}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
          >
            <Text style={styles.actionLabel}>{toast.action.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'stretch',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 12,
    backgroundColor: '#27272A',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#FAFAFA',
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#93B4FC',
  },
});
