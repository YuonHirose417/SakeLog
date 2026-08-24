import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ToastProvider';

export default function RootLayout() {
  return (
    // gesture-handler はルートをこれで包む必要がある（スワイプ削除に必須）
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="record/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="record/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings/budget" />
          </Stack>
          <StatusBar style="auto" />
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
