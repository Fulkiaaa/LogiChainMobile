/**
 * LogiChain Mobile — application terrain (offline-first).
 *
 * @format
 */
import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {COLORS} from '@/config/theme';
import {AuthProvider} from '@/hooks/useAuth';
import {RootNavigator} from '@/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {queries: {retry: 1, staleTime: 30_000}},
});

const navTheme = {
  ...DarkTheme,
  colors: {...DarkTheme.colors, background: COLORS.bg, card: COLORS.surface, text: COLORS.text, primary: COLORS.primary},
};

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
