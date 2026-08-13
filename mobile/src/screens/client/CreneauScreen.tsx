import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';
import { Alert } from '../../utils/alert';

export default function CreneauScreen({ route, navigation }: any) {
  const { boutiqueId, panierId, montant } = route.params;
  const [creneaux, setCreneaux] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modePaiement, setModePaiement] = useState<'sur_place' | 'en_ligne'>('sur_place');
  const [paiementEnCours, setPaiementEnCours] = useState(false);

  useEffect(() => {
    api.get(`/boutiques/${boutiqueId}/creneaux`).then(({ data }) => { setCreneaux(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const confirmer = async () => {
    if (!selected) return Alert.alert('Erreur', 'Sélectionnez un créneau.');
    try {
      if (modePaiement === 'en_ligne') {
        setPaiementEnCours(true);
        const { data: paiement } = await api.post('/payments/simuler', { montant });
        setPaiementEnCours(false);
        if (!paiement.success) {
          Alert.alert('Paiement refusé', paiement.error || 'La simulation de paiement a échoué. Réessayez.');
          return;
        }
      }
      const { data } = await api.post('/commandes', { panier_id: panierId, creneau_id: selected, modePaiement });
      navigation.navigate('CommandeStatut', { commande: data });
    } catch (e: any) {
      setPaiementEnCours(false);
      Alert.alert('Erreur', e.response?.data?.message || 'Impossible de confirmer.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créneau de retrait</Text>
      <Text style={styles.sectionLabel}>Mode de paiement</Text>
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeChip, modePaiement === 'sur_place' && styles.modeChipActive]}
          onPress={() => setModePaiement('sur_place')}
        >
          <Text style={[styles.modeChipText, modePaiement === 'sur_place' && styles.modeChipTextActive]}>
            Payer sur place
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeChip, modePaiement === 'en_ligne' && styles.modeChipActive]}
          onPress={() => setModePaiement('en_ligne')}
        >
          <Text style={[styles.modeChipText, modePaiement === 'en_ligne' && styles.modeChipTextActive]}>
            Payer en ligne (simulation)
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={creneaux}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => {
          const complet = item.capaciteRestante <= 0;
          const isSelected = selected === item.id;
          return (
            <TouchableOpacity
              style={[styles.slot, isSelected && styles.slotActive, complet && styles.slotDisabled]}
              onPress={() => !complet && setSelected(item.id)}
              disabled={complet}
            >
              <Text style={[styles.slotDay, isSelected && styles.slotDayActive]}>{item.jour}</Text>
              <Text style={[styles.slotTime, isSelected && styles.slotTimeActive]}>
                {item.heureDebut}–{item.heureFin}
              </Text>
              {complet && <Text style={styles.complet}>complet</Text>}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>Aucun créneau disponible.</Text>}
      />
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.btn, (!selected || paiementEnCours) && { opacity: 0.4 }]}
          onPress={confirmer}
          disabled={!selected || paiementEnCours}
        >
          {paiementEnCours ? (
            <ActivityIndicator color={COLORS.black} />
          ) : (
            <Text style={styles.btnText}>
              {modePaiement === 'en_ligne' ? 'Payer et confirmer' : 'Confirmer la commande'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 18 },
  sectionLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  modeChip: { flex: 1, borderWidth: 1, borderColor: COLORS.mutedLight, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  modeChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  modeChipText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  modeChipTextActive: { color: COLORS.black },
  slot: { flex: 1, borderWidth: 1, borderColor: COLORS.mutedLight, borderRadius: 6, padding: 14, marginBottom: 10, alignItems: 'center' },
  slotActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  slotDisabled: { opacity: 0.35 },
  slotDay: { color: COLORS.muted, fontSize: 11, marginBottom: 2 },
  slotDayActive: { color: COLORS.black },
  slotTime: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  slotTimeActive: { color: COLORS.black },
  complet: { color: COLORS.red, fontSize: 10, marginTop: 4 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.blackSoft },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40 },
});
