import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';
import ProductCard from '../../components/ProductCard';
import { JOURS, estOuvertMaintenant, formatPlageJour, jourActuel } from '../../utils/horaires';

export default function CatalogueScreen({ route, navigation }: any) {
  const { boutique } = route.params;
  const [produits, setProduits] = useState<any[]>([]);
  const [panier, setPanier] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [horairesOuverts, setHorairesOuverts] = useState(false);
  const ouvert = estOuvertMaintenant(boutique.horaires);

  useEffect(() => {
    api.get(`/boutiques/${boutique.id}/produits`).then(({ data }) => { setProduits(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalItems = Object.values(panier).reduce((s, q) => s + q, 0);

  const updateQty = (produitId: string, delta: number) => {
    setPanier((prev) => {
      const current = prev[produitId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) { const { [produitId]: _, ...rest } = prev; return rest; }
      return { ...prev, [produitId]: next };
    });
  };

  const allerAuPanier = async () => {
    try {
      // Envoie chaque article au backend
      for (const [produit_id, quantite] of Object.entries(panier)) {
        await api.post(`/boutiques/${boutique.id}/panier/articles`, { produit_id, quantite });
      }
      navigation.navigate('Panier', { boutiqueId: boutique.id, boutiqueName: boutique.nom });
    } catch (e: any) {
      // Ex. stock insuffisant depuis le contrôle serveur (voir ProduitsService.reserverStock)
      Alert.alert('Erreur', e.response?.data?.message || "Impossible d'ajouter ces articles au panier.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{boutique.nom}</Text>
      <Text style={styles.adresse}>{boutique.adresse}</Text>
      <TouchableOpacity onPress={() => setHorairesOuverts((v) => !v)} style={styles.horairesToggle}>
        <View style={[styles.dot, ouvert ? styles.dotOuvert : styles.dotFerme]} />
        <Text style={styles.horairesStatut}>
          {ouvert ? 'Ouvert maintenant' : 'Fermé maintenant'} · horaires {horairesOuverts ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      {horairesOuverts && (
        <View style={styles.horairesBlock}>
          {JOURS.map(({ cle, label }) => (
            <View key={cle} style={styles.horairesRow}>
              <Text style={[styles.horairesJour, cle === jourActuel() && styles.horairesJourToday]}>{label}</Text>
              <Text style={styles.horairesPlage}>{formatPlageJour(boutique.horaires, cle)}</Text>
            </View>
          ))}
        </View>
      )}
      <FlatList
        data={produits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            nom={item.nom}
            prix={item.prix}
            quantite={panier[item.id] || 0}
            onAdd={() => updateQty(item.id, 1)}
            onRemove={() => updateQty(item.id, -1)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      {totalItems > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.btn} onPress={allerAuPanier}>
            <Text style={styles.btnText}>Voir mon panier ({totalItems})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 4 },
  horairesToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOuvert: { backgroundColor: COLORS.green },
  dotFerme: { backgroundColor: COLORS.red },
  horairesStatut: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  horairesBlock: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 12, marginBottom: 14 },
  horairesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  horairesJour: { color: COLORS.muted, fontSize: 13 },
  horairesJourToday: { color: COLORS.gold, fontWeight: '700' },
  horairesPlage: { color: COLORS.white, fontSize: 13, fontFamily: 'monospace' },
  adresse: { color: COLORS.muted, fontSize: 13, marginBottom: 18 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.blackSoft },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
});
