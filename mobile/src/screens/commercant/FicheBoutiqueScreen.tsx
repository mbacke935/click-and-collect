import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';

const CATEGORIES = [
  { valeur: 'boulangerie', label: 'Boulangerie' },
  { valeur: 'epicerie', label: 'Épicerie' },
  { valeur: 'friperie', label: 'Friperie' },
  { valeur: 'autre', label: 'Autre' },
];

// Création et modification de la fiche boutique (nom, catégorie, adresse, position) — cf.
// dossier de spécifications, cas d'utilisation Commerçant "Gérer sa fiche boutique
// (horaires, adresse)". Les horaires se gèrent dans un écran dédié (HorairesManagerScreen).
export default function FicheBoutiqueScreen({ route, navigation }: any) {
  const boutique = route.params?.boutique;
  const modeCreation = !boutique;

  const [nom, setNom] = useState(boutique?.nom || '');
  const [categorie, setCategorie] = useState(boutique?.categorie || 'autre');
  const [adresse, setAdresse] = useState(boutique?.adresse || '');
  const [latitude, setLatitude] = useState<number | null>(boutique?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(boutique?.longitude ?? null);
  const [localisationEnCours, setLocalisationEnCours] = useState(false);
  const [saving, setSaving] = useState(false);

  const utiliserPositionActuelle = async () => {
    setLocalisationEnCours(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', "Impossible d'accéder à votre position.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    } catch {
      Alert.alert('Erreur', "Impossible d'obtenir votre position actuelle.");
    } finally {
      setLocalisationEnCours(false);
    }
  };

  const enregistrer = async () => {
    if (!nom.trim() || !adresse.trim()) {
      Alert.alert('Erreur', 'Le nom et l\'adresse sont obligatoires.');
      return;
    }
    const dto = {
      nom: nom.trim(), categorie, adresse: adresse.trim(),
      latitude: latitude ?? undefined, longitude: longitude ?? undefined,
    };
    setSaving(true);
    try {
      if (modeCreation) {
        await api.post('/boutiques', dto);
      } else {
        await api.patch(`/boutiques/${boutique.id}`, dto);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Échec de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 18, paddingTop: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>{modeCreation ? 'Créer ma boutique' : 'Ma boutique'}</Text>

      <Text style={styles.label}>Nom</Text>
      <TextInput
        style={styles.input} placeholder="Ex. Boulangerie du Coin" placeholderTextColor={COLORS.mutedLight}
        value={nom} onChangeText={setNom}
      />

      <Text style={styles.label}>Catégorie</Text>
      <View style={styles.chips}>
        {CATEGORIES.map(({ valeur, label }) => (
          <TouchableOpacity
            key={valeur}
            style={[styles.chip, categorie === valeur && styles.chipActive]}
            onPress={() => setCategorie(valeur)}
          >
            <Text style={[styles.chipText, categorie === valeur && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Adresse</Text>
      <TextInput
        style={styles.input} placeholder="Ex. 12 Avenue Cheikh Anta Diop, Dakar" placeholderTextColor={COLORS.mutedLight}
        value={adresse} onChangeText={setAdresse}
      />

      <Text style={styles.label}>Position (pour le tri par proximité côté client)</Text>
      <Text style={styles.positionValue}>
        {latitude != null && longitude != null ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Non renseignée'}
      </Text>
      <TouchableOpacity
        style={[styles.btnOutline, localisationEnCours && { opacity: 0.5 }]}
        onPress={utiliserPositionActuelle}
        disabled={localisationEnCours}
      >
        {localisationEnCours
          ? <ActivityIndicator color={COLORS.gold} />
          : <Text style={styles.btnOutlineText}>Utiliser ma position actuelle</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, saving && { opacity: 0.5 }]} onPress={enregistrer} disabled={saving}>
        {saving
          ? <ActivityIndicator color={COLORS.black} />
          : <Text style={styles.btnText}>{modeCreation ? 'Créer ma boutique' : 'Enregistrer'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 18 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginTop: 14 },
  input: { borderBottomWidth: 1, borderColor: COLORS.mutedLight, color: COLORS.white, fontSize: 14, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.mutedLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.black },
  positionValue: { color: COLORS.white, fontSize: 13, fontFamily: 'monospace', marginBottom: 10 },
  btnOutline: { borderWidth: 1, borderColor: COLORS.goldDark, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  btnOutlineText: { color: COLORS.gold, fontWeight: '600', fontSize: 13 },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginTop: 24 },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
});
