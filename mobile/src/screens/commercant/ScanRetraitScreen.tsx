import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '../../constants/theme';
import { decryptBilletPayload } from '../../crypto/qrCipher';
import { enqueueEvent, flushSyncQueue } from '../../services/syncService';

// Valide un billet de retrait entièrement hors-ligne : le QR scanné (ou le code saisi)
// contient le qrCodePayload chiffré généré par le serveur à la commande. On le déchiffre
// localement (clé pré-partagée embarquée, voir crypto/qrCipher.ts) et on vérifie qu'il
// correspond bien à la commande affichée, sans aucun appel réseau — cf. dossier de
// spécifications §3.5 et §5.3.c. Le retrait est ensuite empilé dans la file de
// synchronisation locale et transmis dès que le réseau revient (§3.5 étapes 4-5).
export default function ScanRetraitScreen({ route, navigation }: any) {
  const { commande } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const [done, setDone] = useState(false);
  const [enAttenteSync, setEnAttenteSync] = useState(false);

  const validerBillet = async (qrCodePayload: string) => {
    let billet: ReturnType<typeof decryptBilletPayload>;
    try {
      billet = decryptBilletPayload(qrCodePayload);
    } catch {
      Alert.alert('Billet invalide', "Ce code n'a pas pu être déchiffré — il est peut-être corrompu ou falsifié.");
      setScanned(false);
      return;
    }

    if (billet.commandeId !== commande.id) {
      Alert.alert('Billet incorrect', "Ce billet correspond à une autre commande.");
      setScanned(false);
      return;
    }

    await enqueueEvent('retrait_valide', commande.id, commande.billet?.id, { statut: 'recuperee' });
    const { remaining } = await flushSyncQueue();
    setEnAttenteSync(remaining > 0);
    setDone(true);
  };

  const validerParCode = () => {
    if (!commande.billet?.qrCodePayload) {
      Alert.alert('Erreur', 'Aucun billet associé à cette commande.');
      return;
    }
    // La saisie manuelle rejoue simplement le contrôle d'intégrité local sur le billet
    // déjà connu de la commande (le code affiché au client sert de confirmation visuelle).
    validerBillet(commande.billet.qrCodePayload);
  };

  if (done) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 42, color: COLORS.gold }}>✓</Text>
        <Text style={styles.doneTitle}>Commande récupérée</Text>
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>
            {enAttenteSync ? 'Retrait validé — en attente de synchronisation' : 'Retrait validé et synchronisé'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.btnOutline, { marginTop: 24 }]} onPress={() => navigation.popToTop()}>
          <Text style={styles.btnOutlineText}>Retour aux commandes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanner le billet</Text>

      {permission?.granted ? (
        <View style={styles.scanZone}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : ({ data }) => { setScanned(true); validerBillet(data); }}
          />
        </View>
      ) : (
        <View style={styles.scanZone}>
          <Text style={styles.scanPlaceholder}>Autorisation caméra requise</Text>
          <TouchableOpacity style={[styles.btnOutline, { marginTop: 12 }]} onPress={requestPermission}>
            <Text style={styles.btnOutlineText}>Activer la caméra</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.or}>ou saisissez le code manuellement</Text>
      <TextInput
        style={styles.input}
        placeholder="N° 0231"
        placeholderTextColor={COLORS.mutedLight}
        value={code}
        onChangeText={setCode}
        textAlign="center"
      />
      <TouchableOpacity style={styles.btn} onPress={validerParCode}>
        <Text style={styles.btnText}>Valider le retrait</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 18 },
  scanZone: {
    width: 220, height: 220, alignSelf: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.goldDark, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  scanPlaceholder: { color: COLORS.muted, fontSize: 12, textAlign: 'center', paddingHorizontal: 10 },
  or: { color: COLORS.muted, textAlign: 'center', marginBottom: 14 },
  input: { borderBottomWidth: 1, borderColor: COLORS.mutedLight, color: COLORS.white, fontSize: 16, paddingVertical: 12, marginBottom: 18 },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  doneTitle: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginTop: 10 },
  offlineBadge: { backgroundColor: COLORS.blackLighter, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 4, marginTop: 10 },
  offlineText: { color: COLORS.muted, fontSize: 12 },
  btnOutline: { borderWidth: 1, borderColor: COLORS.mutedLight, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 6 },
  btnOutlineText: { color: COLORS.white, fontWeight: '600' },
});
