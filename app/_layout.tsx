import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ToastProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="record/new" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
