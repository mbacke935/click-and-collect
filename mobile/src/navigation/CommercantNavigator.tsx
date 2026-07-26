import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import DashboardScreen from '../screens/commercant/DashboardScreen';
import CommandesScreen from '../screens/commercant/CommandesScreen';
import ScanRetraitScreen from '../screens/commercant/ScanRetraitScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.blackSoft },
  headerTintColor: COLORS.gold,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: COLORS.black },
};

export default function CommercantNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CommandeDetail" component={CommandesScreen} options={{ title: 'Commande' }} />
      <Stack.Screen name="ScanRetrait" component={ScanRetraitScreen} options={{ title: 'Scanner' }} />
    </Stack.Navigator>
  );
}
