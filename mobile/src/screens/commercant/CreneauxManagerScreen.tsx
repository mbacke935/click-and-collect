import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';
import { Alert } from '../../utils/alert';
import PlatformDateTimeInput from '../../components/PlatformDateTimeInput';

const VIDE = { jour: '', heureDebut: '', heureFin: '', capaciteMax: '5' };

// Gestion des créneaux de retrait de la boutique du commerçant — cf. dossier de
// spécifications, cas d'utilisation Commerçant "Définir les capacités de créneaux".
export default function CreneauxManagerScreen({ route }: any) {
  const { boutiqueId } = route.params;
  const [creneaux, setCreneaux] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(VIDE);
  const [saving, setSaving] = useState(false);

  const charger = useCallback(() => {
    api.get(`/boutiques/${boutiqueId}/creneaux`)
      .then(({ data }) => setCreneaux(data))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger les créneaux.'))
      .finally(() => setLoading(false));
  }, [boutiqueId]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const creer = async () => {
    if (!form.jour.trim() || !form.heureDebut.trim() || !form.heureFin.trim()) {
      Alert.alert('Erreur', 'Jour, heure de début et heure de fin sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/boutiques/${boutiqueId}/creneaux`, {
        jour: form.jour.trim(),
        heureDebut: form.heureDebut.trim(),
        heureFin: form.heureFin.trim(),
        capaciteMax: form.capaciteMax.trim() ? parseInt(form.capaciteMax, 10) : undefined,
      });
      setForm(VIDE);
      charger();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Échec de la création.');
    } finally {
      setSaving(false);
    }
  };

  const supprimer = (creneau: any) => {
    Alert.alert('Supprimer ce créneau ?', `${creneau.jour} · ${creneau.heureDebut}–${creneau.heureFin}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/boutiques/${boutiqueId}/creneaux/${creneau.id}`);
            charger();
          } catch (e: any) {
            Alert.alert('Erreur', e.response?.data?.message || 'Échec de la suppression.');
          }
        },
      },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créneaux de retrait</Text>

      <FlatList
        data={creneaux}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => supprimer(item)}>
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{item.jour} · {item.heureDebut}–{item.heureFin}</Text>
              <Text style={styles.cardCapacite}>{item.capaciteRestante}/{item.capaciteMax}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun créneau — ajoutez-en un ci-dessous.</Text>}
      />

      <View style={styles.form}>
        <Text style={styles.formTitle}>Nouveau créneau</Text>
        <PlatformDateTimeInput
          mode="date" placeholder="Choisir le jour" style={styles.input}
          value={form.jour} onChange={(v) => setForm((f) => ({ ...f, jour: v }))}
        />
        <View style={styles.row}>
          <View style={styles.rowInput}>
            <PlatformDateTimeInput
              mode="time" placeholder="Heure de début" style={styles.input}
              value={form.heureDebut} onChange={(v) => setForm((f) => ({ ...f, heureDebut: v }))}
            />
          </View>
          <View style={styles.rowInput}>
            <PlatformDateTimeInput
              mode="time" placeholder="Heure de fin" style={styles.input}
              value={form.heureFin} onChange={(v) => setForm((f) => ({ ...f, heureFin: v }))}
            />
          </View>
        </View>
        <TextInput
          style={styles.input} placeholder="Capacité max" placeholderTextColor={COLORS.mutedLight}
          keyboardType="numeric" value={form.capaciteMax} onChangeText={(v) => setForm((f) => ({ ...f, capaciteMax: v }))}
        />
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.5 }]} onPress={creer} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.btnText}>Ajouter le créneau</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 12 },
  card: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 12, marginBottom: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  cardCapacite: { color: COLORS.gold, fontSize: 13, fontFamily: 'monospace' },
  empty: { color: COLORS.muted, textAlign: 'center', marginVertical: 20 },
  form: { borderTopWidth: 1, borderColor: COLORS.line, paddingTop: 14, marginTop: 6 },
  formTitle: { color: COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  input: { borderBottomWidth: 1, borderColor: COLORS.mutedLight, color: COLORS.white, fontSize: 14, paddingVertical: 8, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 12 },
  rowInput: { flex: 1 },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginTop: 4 },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
});
