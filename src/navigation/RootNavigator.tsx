import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useTheme} from '@/hooks/useTheme';
import {useAuth} from '@/hooks/useAuth';
import {ChangePasswordScreen} from '@/screens/ChangePasswordScreen';
import {ItemDetailScreen} from '@/screens/ItemDetailScreen';
import {LoginScreen} from '@/screens/LoginScreen';
import {MapScreen} from '@/screens/MapScreen';

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
          <Stack.Screen name="Map" component={MapScreen} options={{title: 'Carte du secteur'}} />
        </>
      ) : status === 'must_change_password' ? (
        /*
         * Seule route déclarée dans cet état : l'écran n'est donc pas
         * contournable, ni par un retour arrière ni par une navigation profonde.
         */
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{headerShown: false}}
        />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
      )}
    </Stack.Navigator>
  );
}
