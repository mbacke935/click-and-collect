import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';

export default function PanierScreen({ route, navigation }: any) {
  const { boutiqueId, boutiqueName } = route.params;
  const [panier, setPanier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const charger = () => {
    api.get(`/boutiques/${boutiqueId}/panier`).then(({ data }) => { setPanier(data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(charger, []);

  const total = panier?.lignes?.reduce((s: number, l: any) => s + l.prixUnitaire * l.quantite, 0) || 0;

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon panier</Text>
      <Text style={styles.sub}>{boutiqueName}</Text>
      <FlatList
        data={panier?.lignes || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.lineText}>×{item.quantite}</Text>
            <Text style={[styles.lineText, { flex: 1 }]}>{item.produit_id.substring(0, 8)}…</Text>
            <Text style={styles.prix}>{(item.prixUnitaire * item.quantite).toLocaleString()} FCFA</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>Votre panier est vide.</Text>}
      />
      {total > 0 && (
        <>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{total.toLocaleString()} FCFA</Text>
          </View>
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => navigation.navigate('Creneau', { boutiqueId, panierId: panier.id, montant: total })}
            >
              <Text style={styles.btnText}>Choisir un créneau de retrait</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold },
  sub: { color: COLORS.muted, fontSize: 13, marginBottom: 18 },
  card: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineText: { color: COLORS.white, fontSize: 14 },
  prix: { color: COLORS.white, fontFamily: 'monospace', fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: COLORS.goldDark, paddingTop: 14, marginTop: 10 },
  totalLabel: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  totalValue: { color: COLORS.gold, fontSize: 17, fontWeight: '700', fontFamily: 'monospace' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.blackSoft },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40 },
});
