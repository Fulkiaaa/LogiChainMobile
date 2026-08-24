import React from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {BarChart3, LayoutDashboard, RefreshCw, ScanLine, User} from 'lucide-react-native';

import {useTheme} from '@/hooks/useTheme';
import {DashboardScreen} from '@/screens/DashboardScreen';
import {KpiScreen} from '@/screens/KpiScreen';
import {ProfileScreen} from '@/screens/ProfileScreen';
import {ScanScreen} from '@/screens/ScanScreen';
import {SyncCenterScreen} from '@/screens/SyncCenterScreen';

import type {AgentTabParamList} from './types';

const Tab = createBottomTabNavigator<AgentTabParamList>();

/**
 * Sans en-tête, le contenu passerait sous l'encoche. On réinjecte la marge
 * haute ici plutôt que dans chaque écran. Défini au niveau module : un
 * composant recréé à chaque rendu remonterait tout l'écran.
 */
const withSafeTop = (Screen: React.ComponentType) =>
  function SafeTopScreen() {
    const insets = useSafeAreaInsets();
    return (
      <View style={{flex: 1, paddingTop: insets.top}}>
        <Screen />
      </View>
    );
  };

// Le Scan garde sa caméra en plein écran : il gère sa propre marge sur le
// calque des contrôles.
const SafeDashboard = withSafeTop(DashboardScreen);
const SafeSyncCenter = withSafeTop(SyncCenterScreen);
const SafeKpi = withSafeTop(KpiScreen);
const SafeProfile = withSafeTop(ProfileScreen);

/** Icône Lucide par onglet. Elles reçoivent la couleur de React Navigation,
 *  qui gère lui-même l'état actif/inactif. */
const ICONS: Record<keyof AgentTabParamList, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  Scan: ScanLine,
  SyncCenter: RefreshCw,
  Kpi: BarChart3,
  Profile: User,
};

/** Fabrique le rendu d'icône hors du composant : défini pendant le render, il
 *  serait recréé à chaque passe et remonterait la sous-arborescence. */
const makeTabBarIcon =
  (Icon: typeof LayoutDashboard) =>
  ({color, size}: {color: string; size: number}) =>
    <Icon color={color} size={size} strokeWidth={2} />;

export function AgentTabs() {
  const {c} = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({route}) => {
        return {
          headerShown: false,
          tabBarStyle: {backgroundColor: c.surface, borderTopColor: c.border},
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.textMuted,
          tabBarIcon: makeTabBarIcon(ICONS[route.name]),
        };
      }}>
      <Tab.Screen name="Dashboard" component={SafeDashboard} options={{title: 'Tableau de bord'}} />
      <Tab.Screen name="SyncCenter" component={SafeSyncCenter} options={{title: 'Synchro'}} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{title: 'Scan'}} />
      <Tab.Screen name="Kpi" component={SafeKpi} options={{title: 'KPI'}} />
      <Tab.Screen name="Profile" component={SafeProfile} options={{title: 'Profil'}} />
    </Tab.Navigator>
  );
}
