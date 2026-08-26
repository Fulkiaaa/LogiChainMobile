import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  ChangePassword: undefined;
  AgentTabs: undefined;
  ItemDetail: {id: string};
  /**
   * `focusItemId` centre la carte sur un équipement précis,
   * `focusRouteId` y trace une tournée et cadre sur son trajet.
   */
  Map: {focusItemId?: string; focusRouteId?: string} | undefined;
  Routes: undefined;
};

export type AgentTabParamList = {
  Dashboard: undefined;
  Scan: undefined;
  SyncCenter: undefined;
  Kpi: undefined;
  Profile: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
