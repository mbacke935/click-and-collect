import { Alert as RNAlert, Platform } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

// react-native-web n'implémente pas Alert.alert (no-op silencieux — voir
// react-native-web/src/exports/Alert), ce qui rend toute erreur API ou confirmation de
// suppression invisible en test web. On retombe sur window.alert/window.confirm sur le
// web ; ailleurs, on utilise l'Alert natif (iOS/Android) sans changement de comportement.
function alertWeb(title: string, message?: string, buttons?: AlertButton[]) {
  const texte = [title, message].filter(Boolean).join('\n\n');
  if (typeof window === 'undefined') return;

  if (!buttons || buttons.length <= 1) {
    window.alert(texte);
    buttons?.[0]?.onPress?.();
    return;
  }

  const confirmButton = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  if (window.confirm(texte)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}

export const Alert = Platform.OS === 'web' ? { alert: alertWeb } : RNAlert;
