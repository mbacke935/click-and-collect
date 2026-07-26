import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['Toutes', 'boulangerie', 'epicerie', 'friperie'];

export default function BoutiqueListScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [filtre, setFiltre] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/boutiques').then(({ data }) => { setBoutiques(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = boutiques.filter((b) => {
    if (filtre !== 'Toutes' && b.categorie !== filtre) return false;
    if (search && !b.nom.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>Bonjour</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('MesBillets')}>
            <Text style={styles.headerLink}>Mes billets</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logout}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Rechercher une boutique..."
        placeholderTextColor={COLORS.mutedLight}
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.chips}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, filtre === cat && styles.chipActive]}
            onPress={() => setFiltre(cat)}
          >
            <Text style={[styles.chipText, filtre === cat && styles.chipTextActive]}>
              {cat === 'Toutes' ? 'Toutes' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Catalogue', { boutique: item })}
          >
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{item.nom}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Ouvert</Text>
              </View>
            </View>
            <Text style={styles.cardSub}>{item.adresse}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucune boutique trouvée.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 50 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.gold },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerLink: { color: COLORS.gold, fontSize: 13, fontWeight: '600' },
  logout: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  search: { borderBottomWidth: 1, borderColor: COLORS.mutedLight, color: COLORS.white, fontSize: 14, paddingVertical: 10, marginBottom: 16 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  chip: { borderWidth: 1, borderColor: COLORS.mutedLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.black },
  card: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  cardSub: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  badge: { backgroundColor: 'rgba(74,222,128,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 },
  badgeText: { color: COLORS.green, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40 },
});
