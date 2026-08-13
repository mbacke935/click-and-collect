import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Alert } from '../../utils/alert';
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

  const annuler = () => {
    Alert.alert(
      'Annuler la commande ?',
      'Le stock et le créneau seront libérés. Cette action est irréversible.',
      [
        { text: 'Retour', style: 'cancel' },
        { text: 'Annuler la commande', style: 'destructive', onPress: () => changerStatut('annulee') },
      ],
    );
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

      {commande.panier?.lignes?.length > 0 && (
        <View style={styles.receiptBlock}>
          <Text style={styles.receiptTitle}>À préparer</Text>
          {commande.panier.lignes.map((ligne: any) => (
            <View key={ligne.id} style={styles.receiptRow}>
              <Text style={styles.receiptQty}>×{ligne.quantite}</Text>
              <Text style={styles.receiptNom} numberOfLines={1}>{ligne.produit?.nom || 'Article'}</Text>
              <Text style={styles.receiptPrix}>{(ligne.prixUnitaire * ligne.quantite).toLocaleString()} FCFA</Text>
            </View>
          ))}
        </View>
      )}

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
      {commande.statut === 'recue' && (
        <TouchableOpacity style={styles.btnAnnuler} onPress={annuler}>
          <Text style={styles.btnAnnulerText}>Annuler la commande</Text>
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
  btnAnnuler: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.red,
    paddingVertical: 14, borderRadius: 6, alignItems: 'center',
  },
  btnAnnulerText: { color: COLORS.red, fontWeight: '700', fontSize: 15 },
  receiptBlock: {
    backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line,
    borderRadius: 6, padding: 14, marginTop: 4,
  },
  receiptTitle: { color: COLORS.gold, fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  receiptQty: { color: COLORS.muted, fontSize: 13, width: 28 },
  receiptNom: { flex: 1, color: COLORS.white, fontSize: 14 },
  receiptPrix: { color: COLORS.white, fontFamily: 'monospace', fontSize: 13 },
});
