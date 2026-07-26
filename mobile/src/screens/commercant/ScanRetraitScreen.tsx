import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';

export default function ScanRetraitScreen({ route, navigation }: any) {
  const { commande } = route.params;
  const [code, setCode] = useState('');
  const [done, setDone] = useState(false);

  const validerRetrait = async () => {
    try {
      await api.patch(`/commandes/${commande.id}/statut`, { statut: 'recuperee' });
      setDone(true);
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Échec de la validation.');
    }
  };

  if (done) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 42, color: COLORS.gold }}>✓</Text>
        <Text style={styles.doneTitle}>Commande récupérée</Text>
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>Retrait validé</Text>
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
      <View style={styles.scanZone}>
        <Text style={styles.scanPlaceholder}>Zone de scan caméra</Text>
      </View>
      <Text style={styles.or}>ou saisissez le code manuellement</Text>
      <TextInput
        style={styles.input}
        placeholder="N° 0231"
        placeholderTextColor={COLORS.mutedLight}
        value={code}
        onChangeText={setCode}
        textAlign="center"
      />
      <TouchableOpacity style={styles.btn} onPress={validerRetrait}>
        <Text style={styles.btnText}>Valider le retrait</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 18 },
  scanZone: {
    width: 220, height: 220, alignSelf: 'center',
    borderWidth: 1, borderColor: COLORS.goldDark, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  scanPlaceholder: { color: COLORS.muted, fontSize: 12 },
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
