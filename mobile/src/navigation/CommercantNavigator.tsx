import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import DashboardScreen from '../screens/commercant/DashboardScreen';
import CommandesScreen from '../screens/commercant/CommandesScreen';
import ScanRetraitScreen from '../screens/commercant/ScanRetraitScreen';
import CatalogueManagerScreen from '../screens/commercant/CatalogueManagerScreen';
import CreneauxManagerScreen from '../screens/commercant/CreneauxManagerScreen';
import HorairesManagerScreen from '../screens/commercant/HorairesManagerScreen';
import FicheBoutiqueScreen from '../screens/commercant/FicheBoutiqueScreen';

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
      <Stack.Screen name="CatalogueManager" component={CatalogueManagerScreen} options={{ title: 'Catalogue' }} />
      <Stack.Screen name="CreneauxManager" component={CreneauxManagerScreen} options={{ title: 'Créneaux' }} />
      <Stack.Screen name="HorairesManager" component={HorairesManagerScreen} options={{ title: 'Horaires' }} />
      <Stack.Screen name="FicheBoutique" component={FicheBoutiqueScreen} options={{ title: 'Ma boutique' }} />
    </Stack.Navigator>
  );
}
