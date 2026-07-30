import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';
import { saveCommandes, getCommandesHorsLigne } from '../../services/offlineDb';
import StatusBadge from '../../components/StatusBadge';

// Liste des commandes du client, avec repli automatique sur le cache SQLite
// local (billets QR inclus) lorsque le réseau est indisponible.
export default function BilletRetraitScreen({ navigation }: any) {
  const [commandes, setCommandes] = useState<any[]>([]);
  const [horsLigne, setHorsLigne] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const { data } = await api.get('/commandes/me');
          if (!active) return;
          setCommandes(data);
          setHorsLigne(false);
          await saveCommandes(data);
        } catch {
          const cache = await getCommandesHorsLigne();
          if (!active) return;
          setCommandes(cache);
          setHorsLigne(true);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, []),
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes billets</Text>
      {horsLigne && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>Hors ligne — dernières données connues</Text>
        </View>
      )}
      <FlatList
        data={commandes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CommandeStatut', { commande: item })}
          >
            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{item.boutiqueNom || `N° ${item.id.substring(0, 8).toUpperCase()}`}</Text>
              <StatusBadge statut={item.statut} />
            </View>
            <Text style={styles.cardSub}>
              {item.montantTotal?.toLocaleString()} FCFA · {item.creneau?.jour || '—'}
            </Text>
            {item.boutiqueAdresse && (
              <Text style={styles.cardAdresse} numberOfLines={1}>{item.boutiqueAdresse}</Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>Aucune commande pour l'instant.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 12 },
  offlineBadge: { backgroundColor: COLORS.blackLighter, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, marginBottom: 14 },
  offlineText: { color: COLORS.muted, fontSize: 12, textAlign: 'center' },
  card: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  cardSub: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  cardAdresse: { color: COLORS.mutedLight, fontSize: 12, marginTop: 2 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40 },
});
