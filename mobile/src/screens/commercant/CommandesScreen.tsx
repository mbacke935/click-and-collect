import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { COLORS } from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

const NEXT_STATUT: Record<string, { label: string; statut: string }> = {
  recue: { label: 'Marquer en préparation', statut: 'en_preparation' },
  en_preparation: { label: 'Prête pour retrait', statut: 'prete' },
  prete: { label: 'Scanner le billet', statut: '' },
};

export default function CommandesScreen({ route, navigation }: any) {
  const [commande, setCommande] = useState(route.params.commande);
  const next = NEXT_STATUT[commande.statut];

  const changerStatut = async (statut: string) => {
    try {
      const { data } = await api.patch(`/commandes/${commande.id}/statut`, { statut });
      setCommande(data);
      Alert.alert('Succès', `Statut mis à jour : ${statut}`);
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Échec.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Commande</Text>
        <StatusBadge statut={commande.statut} />
      </View>
      <Text style={styles.montant}>{commande.montantTotal?.toLocaleString()} FCFA</Text>
      <Text style={styles.info}>
        Créneau : {commande.creneau?.jour || '—'} · {commande.creneau?.heureDebut || '—'}–{commande.creneau?.heureFin || '—'}
      </Text>
      <View style={{ flex: 1 }} />
      {next && next.statut && (
        <TouchableOpacity style={styles.btn} onPress={() => changerStatut(next.statut)}>
          <Text style={styles.btnText}>{next.label}</Text>
        </TouchableOpacity>
      )}
      {commande.statut === 'prete' && (
        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('ScanRetrait', { commande })}
        >
          <Text style={styles.btnText}>Scanner le billet de retrait</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold },
  montant: { color: COLORS.gold, fontFamily: 'monospace', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  info: { color: COLORS.muted, fontSize: 13 },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginBottom: 10 },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
});
