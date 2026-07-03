import type {NativeStackScreenProps} from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  AgentTabs: undefined;
  ItemDetail: {id: string};
};

export type AgentTabParamList = {
  Dashboard: undefined;
  Scan: undefined;
  SyncCenter: undefined;
  Kpi: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
