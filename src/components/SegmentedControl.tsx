import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Option } from '@/lib/labels';

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** アクセシビリティ用のラベル（「カテゴリ」など）。 */
  label: string;
};

/**
 * 横並びの単一選択コントロール。
 * カテゴリ4択と酒種で共用する。未選択（value === null）を表現できる。
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4D4D8',
    backgroundColor: '#FFFFFF',
  },
  segmentSelected: {
    borderColor: '#1D4ED8',
    backgroundColor: '#E8EFFD',
  },
  text: {
    fontSize: 14,
    color: '#3F3F46',
  },
  textSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});
