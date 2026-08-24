/**
 * LogiChain Mobile — application terrain (offline-first).
 *
 * @format
 */
import React, {useMemo} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer, DarkTheme, DefaultTheme} from '@react-navigation/native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {AuthProvider} from '@/hooks/useAuth';
import {ThemeProvider, useTheme} from '@/hooks/useTheme';
import {RootNavigator} from '@/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {queries: {retry: 1, staleTime: 30_000}},
});

/**
 * Applique la palette au conteneur de navigation et à la barre d'état.
 * Séparé de `App` car `useTheme` doit être consommé sous le provider.
 */
function ThemedApp() {
  const {c, scheme} = useTheme();

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: c.bg,
        card: c.surface,
        text: c.text,
        primary: c.primary,
        border: c.border,
      },
    };
  }, [c, scheme]);

  return (
    <>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default App;
