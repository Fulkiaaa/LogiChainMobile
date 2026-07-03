import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {COLORS} from '@/config/theme';
import {DashboardScreen} from '@/screens/DashboardScreen';
import {KpiScreen} from '@/screens/KpiScreen';
import {ScanScreen} from '@/screens/ScanScreen';
import {SyncCenterScreen} from '@/screens/SyncCenterScreen';

import type {AgentTabParamList} from './types';

const Tab = createBottomTabNavigator<AgentTabParamList>();

const ICONS: Record<keyof AgentTabParamList, string> = {
  Dashboard: '🏠',
  Scan: '📷',
  SyncCenter: '🔄',
  Kpi: '📊',
};

export function AgentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerStyle: {backgroundColor: COLORS.surface},
        headerTintColor: COLORS.text,
        tabBarStyle: {backgroundColor: COLORS.surface, borderTopColor: COLORS.border},
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: () => <TabIcon emoji={ICONS[route.name]} />,
      })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{title: 'Tableau de bord'}} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{title: 'Scan'}} />
      <Tab.Screen name="SyncCenter" component={SyncCenterScreen} options={{title: 'Synchro'}} />
      <Tab.Screen name="Kpi" component={KpiScreen} options={{title: 'KPI'}} />
    </Tab.Navigator>
  );
}

import {Text} from 'react-native';
function TabIcon({emoji}: {emoji: string}) {
  return <Text style={{fontSize: 20}}>{emoji}</Text>;
}
