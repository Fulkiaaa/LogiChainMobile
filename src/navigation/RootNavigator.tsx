import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useTheme} from '@/hooks/useTheme';
import {useAuth} from '@/hooks/useAuth';
import {ItemDetailScreen} from '@/screens/ItemDetailScreen';
import {LoginScreen} from '@/screens/LoginScreen';

import {AgentTabs} from './AgentTabs';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {status} = useAuth();
  const {c} = useTheme();

  if (status === 'loading') {
    return (
      <View style={{flex: 1, justifyContent: 'center', backgroundColor: c.bg}}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: c.surface},
        headerTintColor: c.text,
        contentStyle: {backgroundColor: c.bg},
      }}>
      {status === 'authed' ? (
        <>
          <Stack.Screen name="AgentTabs" component={AgentTabs} options={{headerShown: false}} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{title: 'Fiche équipement'}} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
      )}
    </Stack.Navigator>
  );
}
