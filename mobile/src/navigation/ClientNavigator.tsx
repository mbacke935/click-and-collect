import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import BoutiqueListScreen from '../screens/client/BoutiqueListScreen';
import CatalogueScreen from '../screens/client/CatalogueScreen';
import PanierScreen from '../screens/client/PanierScreen';
import CreneauScreen from '../screens/client/CreneauScreen';
import CommandeStatutScreen from '../screens/client/CommandeStatutScreen';
import BilletRetraitScreen from '../screens/client/BilletRetraitScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.blackSoft },
  headerTintColor: COLORS.gold,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: COLORS.black },
};

export default function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="BoutiqueList" component={BoutiqueListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Catalogue" component={CatalogueScreen} options={{ title: 'Catalogue' }} />
      <Stack.Screen name="Panier" component={PanierScreen} options={{ title: 'Mon panier' }} />
      <Stack.Screen name="Creneau" component={CreneauScreen} options={{ title: 'Créneau' }} />
      <Stack.Screen name="CommandeStatut" component={CommandeStatutScreen} options={{ title: 'Commande', headerBackVisible: false }} />
      <Stack.Screen name="MesBillets" component={BilletRetraitScreen} options={{ title: 'Mes billets' }} />
    </Stack.Navigator>
  );
}
