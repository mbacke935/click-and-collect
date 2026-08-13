import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';

// expo-secure-store n'a aucune implémentation web (module natif vide sur cette
// plateforme) : un appel direct y lève une erreur. On retombe donc sur localStorage
// pour permettre de tester l'app via `expo start --web`. Ce n'est PAS un stockage
// sécurisé sur web (accessible en clair via les devtools) — uniquement destiné aux
// tests locaux, jamais à un déploiement web en production.
const isWeb = Platform.OS === 'web';

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }
  return ExpoSecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await ExpoSecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await ExpoSecureStore.deleteItemAsync(key);
}
