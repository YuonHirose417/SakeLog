import type { ReactNode } from 'react';

import { Pressable, StyleSheet, Text } from 'react-native';

import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

type SwipeToDeleteRowProps = {
  children: ReactNode;
  onDelete: () => void;
  /** 削除ボタンの読み上げ用ラベル。 */
  accessibilityLabel?: string;
};

/**
 * 左スワイプで削除アクションを出す行のラッパー。
 * ルートが GestureHandlerRootView で包まれていることが前提（app/_layout.tsx）。
 */
export function SwipeToDeleteRow({
  children,
  onDelete,
  accessibilityLabel = '削除',
}: SwipeToDeleteRowProps) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          onPress={() => {
            methods.close();
            onDelete();
          }}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          <Text style={styles.actionLabel}>削除</Text>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
  },
  actionLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
