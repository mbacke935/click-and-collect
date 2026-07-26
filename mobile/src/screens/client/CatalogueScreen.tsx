import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';
import ProductCard from '../../components/ProductCard';

export default function CatalogueScreen({ route, navigation }: any) {
  const { boutique } = route.params;
  const [produits, setProduits] = useState<any[]>([]);
  const [panier, setPanier] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

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
    // Envoie chaque article au backend
    for (const [produit_id, quantite] of Object.entries(panier)) {
      await api.post(`/boutiques/${boutique.id}/panier/articles`, { produit_id, quantite });
    }
    navigation.navigate('Panier', { boutiqueId: boutique.id, boutiqueName: boutique.nom });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{boutique.nom}</Text>
      <Text style={styles.adresse}>{boutique.adresse}</Text>
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
  adresse: { color: COLORS.muted, fontSize: 13, marginBottom: 18 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.blackSoft },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
});
