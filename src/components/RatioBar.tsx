import { StyleSheet, View } from 'react-native';

type RatioBarProps = {
  /** 0〜1 の割合。範囲外は丸める。 */
  ratio: number;
  color: string;
};

/**
 * 割合を表す横棒。
 *
 * グラフ用のネイティブ依存（react-native-svg 等）を増やさないよう、View の幅比率だけで描く。
 * 要件定義 §4.4 は「円グラフ or 横棒グラフ」なので横棒で満たす。
 */
export function RatioBar({ ratio, color }: RatioBarProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E4E4E7',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4 },
});
