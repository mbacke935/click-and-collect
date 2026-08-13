import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';
import { JOURS, type Horaires } from '../../utils/horaires';
import { Alert } from '../../utils/alert';
import PlatformDateTimeInput from '../../components/PlatformDateTimeInput';

type FormJour = { ouvert: boolean; debut: string; fin: string };
type Form = Record<string, FormJour>;

const JOUR_VIDE: FormJour = { ouvert: false, debut: '', fin: '' };

function horairesVersForm(horaires: Horaires | null | undefined): Form {
  const form: Form = {};
  for (const { cle } of JOURS) {
    const plage = horaires?.[cle];
    form[cle] = plage ? { ouvert: true, debut: plage.ouvert, fin: plage.ferme } : { ...JOUR_VIDE };
  }
  return form;
}

// Gestion des horaires d'ouverture de la boutique — cf. dossier de spécifications, vitrine
// digitale "présentation des commerces avec horaires" (§Module 1) et cas d'utilisation
// Commerçant "Gérer sa fiche boutique (horaires, adresse)".
export default function HorairesManagerScreen({ route }: any) {
  const { boutiqueId } = route.params;
  const [form, setForm] = useState<Form>(horairesVersForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const charger = useCallback(() => {
    api.get(`/boutiques/${boutiqueId}`)
      .then(({ data }) => setForm(horairesVersForm(data.horaires)))
      .catch(() => Alert.alert('Erreur', 'Impossible de charger les horaires.'))
      .finally(() => setLoading(false));
  }, [boutiqueId]);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const majJour = (cle: string, patch: Partial<FormJour>) => {
    setForm((f) => ({ ...f, [cle]: { ...f[cle], ...patch } }));
  };

  const enregistrer = async () => {
    for (const { cle, label } of JOURS) {
      const jour = form[cle];
      if (jour.ouvert && (!jour.debut.trim() || !jour.fin.trim())) {
        Alert.alert('Erreur', `Renseignez les heures d'ouverture et de fermeture pour ${label}, ou marquez ce jour comme fermé.`);
        return;
      }
    }
    const horaires: Horaires = {};
    for (const { cle } of JOURS) {
      const jour = form[cle];
      if (jour.ouvert) horaires[cle] = { ouvert: jour.debut.trim(), ferme: jour.fin.trim() };
    }
    setSaving(true);
    try {
      await api.patch(`/boutiques/${boutiqueId}`, { horaires });
      Alert.alert('Succès', 'Horaires mis à jour.');
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Échec de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 18, paddingTop: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Horaires d'ouverture</Text>
      {JOURS.map(({ cle, label }) => {
        const jour = form[cle];
        return (
          <View key={cle} style={styles.jourRow}>
            <View style={styles.jourHeader}>
              <Text style={styles.jourLabel}>{label}</Text>
              <Switch
                value={jour.ouvert}
                onValueChange={(v) => majJour(cle, { ouvert: v })}
                trackColor={{ false: COLORS.line, true: COLORS.goldDark }}
                thumbColor={jour.ouvert ? COLORS.gold : COLORS.mutedLight}
              />
            </View>
            {jour.ouvert && (
              <View style={styles.row}>
                <View style={styles.rowInput}>
                  <PlatformDateTimeInput
                    mode="time" placeholder="Heure d'ouverture" style={styles.input}
                    value={jour.debut} onChange={(v) => majJour(cle, { debut: v })}
                  />
                </View>
                <View style={styles.rowInput}>
                  <PlatformDateTimeInput
                    mode="time" placeholder="Heure de fermeture" style={styles.input}
                    value={jour.fin} onChange={(v) => majJour(cle, { fin: v })}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}
      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.5 }]} onPress={enregistrer} disabled={saving}>
        {saving ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.btnText}>Enregistrer les horaires</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 16 },
  jourRow: { borderBottomWidth: 1, borderColor: COLORS.line, paddingBottom: 12, marginBottom: 12 },
  jourHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jourLabel: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rowInput: { flex: 1 },
  input: { borderBottomWidth: 1, borderColor: COLORS.mutedLight, color: COLORS.white, fontSize: 14, paddingVertical: 8 },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
});
