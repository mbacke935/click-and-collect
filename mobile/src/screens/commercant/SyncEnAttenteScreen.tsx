import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import { getPendingEvents, flushSyncQueue, type SyncQueueItem } from '../../services/syncService';

const ACTION_LABELS: Record<string, string> = {
  retrait_valide: 'Retrait validé hors-ligne',
  statut_change: 'Changement de statut',
};

// Consultation des événements (retraits validés hors-ligne, notamment) qui n'ont pas
// encore été confirmés par le serveur — cf. dossier de spécifications, cas d'utilisation
// Commerçant "Consulter les commandes en attente de synchronisation" et §3.5 étape 4-5.
export default function SyncEnAttenteScreen() {
  const [events, setEvents] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [synchronisation, setSynchronisation] = useState(false);

  const charger = useCallback(() => {
    getPendingEvents().then(setEvents).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { charger(); }, [charger]));

  const reessayer = async () => {
    setSynchronisation(true);
    const { synced, echecs, remaining } = await flushSyncQueue();
    setSynchronisation(false);
    charger();
    if (synced === 0 && echecs === 0 && remaining > 0) {
      Alert.alert('Toujours hors ligne', 'Aucune connexion disponible — nouvelle tentative au prochain retour sur cet écran.');
    } else if (echecs > 0) {
      Alert.alert(
        'Certains retraits ont été refusés',
        `${synced} transmis avec succès, ${echecs} refusé${echecs > 1 ? 's' : ''} par le serveur (voir le détail ci-dessous).`,
      );
    } else if (synced > 0) {
      Alert.alert('Synchronisé', `${synced} retrait${synced > 1 ? 's' : ''} transmis au serveur.`);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>En attente de synchronisation</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.eventId}
        renderItem={({ item }) => {
          const enEchec = item.statut === 'echec';
          return (
            <View style={[styles.card, enEchec && styles.cardEchec]}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>Commande N° {item.commande_id.substring(0, 8).toUpperCase()}</Text>
                {enEchec && (
                  <View style={styles.badgeEchec}>
                    <Text style={styles.badgeEchecText}>Refusé</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardSub}>{ACTION_LABELS[item.action] || item.action}</Text>
              <Text style={styles.cardDate}>{new Date(item.horodatageLocal).toLocaleString()}</Text>
              {enEchec && item.payload?.error && (
                <Text style={styles.cardErreur}>{item.payload.error}</Text>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 8 }}
        ListEmptyComponent={<Text style={styles.empty}>Aucun événement en attente — tout est synchronisé.</Text>}
      />
      <TouchableOpacity
        style={[styles.btn, (synchronisation || events.length === 0) && { opacity: 0.5 }]}
        onPress={reessayer}
        disabled={synchronisation || events.length === 0}
      >
        {synchronisation
          ? <ActivityIndicator color={COLORS.black} />
          : <Text style={styles.btnText}>Réessayer la synchronisation</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 16 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 14 },
  card: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 14, marginBottom: 10 },
  cardEchec: { borderColor: COLORS.red },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: COLORS.white, fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  cardSub: { color: COLORS.gold, fontSize: 13, marginTop: 4 },
  cardDate: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  cardErreur: { color: COLORS.red, fontSize: 12, marginTop: 6 },
  badgeEchec: { backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 },
  badgeEchecText: { color: COLORS.red, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40 },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
});
