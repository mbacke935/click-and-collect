import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { connectSocket } from '../../services/socketService';
import { flushSyncQueue, countPendingEvents } from '../../services/syncService';
import { saveCommandes, getCommandesHorsLigneParBoutique, setCache, getCache } from '../../services/offlineDb';

const FILTRES = ['recue', 'en_preparation', 'prete', 'recuperee'];
const FILTRE_LABELS: Record<string, string> = {
  recue: 'Nouvelles', en_preparation: 'En prép.', prete: 'Prêtes', recuperee: 'Récupérées',
};

export default function DashboardScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [boutiques, setBoutiques] = useState<any[]>([]);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [filtre, setFiltre] = useState('recue');
  const [loading, setLoading] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [enAttenteSync, setEnAttenteSync] = useState(0);

  // Clé du cache local (chiffré) où l'on garde la liste des boutiques du commerçant :
  // sans réseau, /boutiques/me/boutiques est injoignable, mais il faut quand même savoir
  // quelle boutique consulter pour filtrer le cache des commandes (voir offlineDb.ts).
  const CACHE_BOUTIQUES = 'mesBoutiques';

  // useFocusEffect (plutôt qu'un simple useEffect au montage) : recharge aussi au retour
  // depuis FicheBoutiqueScreen après création/modification de la boutique, ou depuis les
  // écrans de gestion — sans quoi le tableau de bord resterait affiché avec des données
  // périmées (ex. toujours "aucune boutique" juste après en avoir créé une).
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          // Tentative opportuniste de rattrapage : si des retraits ont été validés hors-ligne
          // (voir ScanRetraitScreen), on essaie de les transmettre dès que ce tableau de bord
          // est ouvert avec une connexion disponible, avant de recompter ce qu'il en reste
          // (voir cas d'utilisation Commerçant "Consulter les commandes en attente de sync").
          await flushSyncQueue();
          setEnAttenteSync(await countPendingEvents());

          let bList: any[] = [];
          let boutiquesHorsLigne = false;
          try {
            const res = await api.get('/boutiques/me/boutiques');
            bList = res.data;
            await setCache(CACHE_BOUTIQUES, bList);
          } catch {
            boutiquesHorsLigne = true;
            try {
              bList = (await getCache<any[]>(CACHE_BOUTIQUES)) || [];
            } catch {
              bList = [];
            }
          }
          setBoutiques(bList);

          if (bList.length > 0) {
            try {
              const { data: cList } = await api.get(`/commandes/boutique/${bList[0].id}`);
              setCommandes(cList);
              setHorsLigne(boutiquesHorsLigne);
              await saveCommandes(cList);
            } catch {
              setHorsLigne(true);
              try {
                setCommandes(await getCommandesHorsLigneParBoutique(bList[0].id));
              } catch {
                setCommandes([]);
              }
            }
          } else {
            setHorsLigne(boutiquesHorsLigne);
          }
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  // Rafraîchit la liste en direct dès qu'une commande de la boutique change (WebSocket)
  useEffect(() => {
    const boutiqueId = boutiques[0]?.id;
    if (!boutiqueId) return;
    let active = true;
    let sock: any = null;
    const onUpdate = (payload: any) => {
      if (payload.boutique_id !== boutiqueId) return;
      setCommandes((prev) => {
        const existe = prev.some((c) => c.id === payload.id);
        if (existe) return prev.map((c) => (c.id === payload.id ? { ...c, ...payload } : c));
        return [payload, ...prev];
      });
    };
    connectSocket().then((socket) => {
      if (!active || !socket) return;
      sock = socket;
      sock.on('commande:update', onUpdate);
    });
    return () => { active = false; sock?.off('commande:update', onUpdate); };
  }, [boutiques]);

  const filtered = commandes.filter((c) => c.statut === filtre);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{boutiques[0]?.nom || 'Ma boutique'}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
      {horsLigne && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineText}>Hors ligne — dernières commandes connues</Text>
        </View>
      )}
      {enAttenteSync > 0 && (
        <TouchableOpacity style={styles.syncBadge} onPress={() => navigation.navigate('SyncEnAttente')}>
          <Text style={styles.syncBadgeText}>
            {enAttenteSync} retrait{enAttenteSync > 1 ? 's' : ''} en attente de synchronisation →
          </Text>
        </TouchableOpacity>
      )}
      {boutiques.length === 0 ? (
        <View style={styles.emptyBoutique}>
          <Text style={styles.emptyBoutiqueText}>
            Vous n'avez pas encore de boutique. Créez votre fiche (nom, catégorie, adresse)
            pour commencer à recevoir des commandes.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('FicheBoutique')}>
            <Text style={styles.btnText}>Créer ma boutique</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => navigation.navigate('ScanRetrait', { boutiqueId: boutiques[0]?.id })}
          >
            <Text style={styles.scanBtnText}>Scanner un billet de retrait</Text>
          </TouchableOpacity>
          <View style={styles.manageRow}>
            <TouchableOpacity
              style={styles.manageChip}
              onPress={() => navigation.navigate('FicheBoutique', { boutique: boutiques[0] })}
            >
              <Text style={styles.manageChipText}>Ma boutique</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.manageChip}
              onPress={() => navigation.navigate('CatalogueManager', { boutiqueId: boutiques[0]?.id })}
            >
              <Text style={styles.manageChipText}>Gérer le catalogue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.manageChip}
              onPress={() => navigation.navigate('CreneauxManager', { boutiqueId: boutiques[0]?.id })}
            >
              <Text style={styles.manageChipText}>Gérer les créneaux</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.manageChip}
              onPress={() => navigation.navigate('HorairesManager', { boutiqueId: boutiques[0]?.id })}
            >
              <Text style={styles.manageChipText}>Gérer les horaires</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chips}>
            {FILTRES.map((f) => {
              const count = commandes.filter((c) => c.statut === f).length;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, filtre === f && styles.chipActive]}
                  onPress={() => setFiltre(f)}
                >
                  <Text style={[styles.chipText, filtre === f && styles.chipTextActive]}>
                    {FILTRE_LABELS[f]} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('CommandeDetail', { commande: item, boutiqueId: boutiques[0]?.id })}
              >
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>Commande</Text>
                  <StatusBadge statut={item.statut} />
                </View>
                <Text style={styles.cardSub}>
                  {item.montantTotal?.toLocaleString()} FCFA · {item.creneau?.heureDebut || '—'}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Aucune commande {FILTRE_LABELS[filtre]?.toLowerCase()}.</Text>}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black, padding: 18, paddingTop: 50 },
  center: { flex: 1, backgroundColor: COLORS.black, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold },
  logout: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  offlineBadge: { backgroundColor: COLORS.blackLighter, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, marginBottom: 14 },
  offlineText: { color: COLORS.muted, fontSize: 12, textAlign: 'center' },
  syncBadge: { backgroundColor: 'rgba(212,168,67,0.12)', borderWidth: 1, borderColor: COLORS.goldDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, marginBottom: 14 },
  syncBadgeText: { color: COLORS.gold, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  emptyBoutique: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 18, marginTop: 20 },
  emptyBoutiqueText: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginBottom: 16, textAlign: 'center' },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  scanBtn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginBottom: 14 },
  scanBtnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  manageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  manageChip: { flexGrow: 1, minWidth: '30%', borderWidth: 1, borderColor: COLORS.goldDark, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  manageChipText: { color: COLORS.gold, fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { borderWidth: 1, borderColor: COLORS.mutedLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.black },
  card: { backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  cardSub: { color: COLORS.muted, fontSize: 13, marginTop: 4, fontFamily: 'monospace' },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40 },
});
