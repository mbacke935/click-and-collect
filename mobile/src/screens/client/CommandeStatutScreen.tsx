import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import { connectSocket } from '../../services/socketService';
import { saveCommande } from '../../services/offlineDb';

const STEPS = ['recue', 'en_preparation', 'prete', 'recuperee'];
const STEP_LABELS = ['Reçue', 'En préparation', 'Prête', 'Récupérée'];

export default function CommandeStatutScreen({ route }: any) {
  const [commande, setCommande] = useState(route.params.commande);
  const currentStep = STEPS.indexOf(commande.statut);

  // Met en cache la commande (billet inclus) pour une consultation hors-ligne
  useEffect(() => { saveCommande(commande); }, [commande]);

  // Suit les changements de statut de cette commande en direct (WebSocket)
  useEffect(() => {
    let active = true;
    let sock: any = null;
    const onUpdate = (payload: any) => {
      if (payload.id !== commande.id) return;
      setCommande((prev: any) => ({ ...prev, ...payload }));
    };
    connectSocket().then((socket) => {
      if (!active || !socket) return;
      sock = socket;
      sock.on('commande:update', onUpdate);
    });
    return () => { active = false; sock?.off('commande:update', onUpdate); };
  }, [commande.id]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 18, paddingTop: 16 }}>
      <Text style={styles.title}>Votre billet de retrait</Text>
      <StatusBadge statut={commande.statut} />

      <View style={styles.track}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <View style={[
              styles.dot,
              i <= currentStep && styles.dotDone,
              i === currentStep && styles.dotCurrent,
            ]}>
              <Text style={styles.dotText}>{i < currentStep ? '✓' : i + 1}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.line, i < currentStep && styles.lineDone]} />
            )}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {STEP_LABELS.map((label) => (
          <Text key={label} style={styles.labelText}>{label}</Text>
        ))}
      </View>

      {commande.billet && (
        <QRCodeDisplay
          value={commande.billet.qrCodePayload}
          boutique={commande.boutiqueNom || commande.boutique_id.substring(0, 8)}
          creneau={commande.creneau ? `${commande.creneau.jour} · ${commande.creneau.heureDebut}–${commande.creneau.heureFin}` : ''}
          code={`N° ${commande.id.substring(0, 4).toUpperCase()}`}
        />
      )}

      {commande.boutiqueAdresse && (
        <View style={styles.boutiqueBlock}>
          <Text style={styles.boutiqueLabel}>À retirer chez</Text>
          <Text style={styles.boutiqueNom}>{commande.boutiqueNom}</Text>
          <Text style={styles.boutiqueAdresse}>{commande.boutiqueAdresse}</Text>
        </View>
      )}

      {commande.panier?.lignes?.length > 0 && (
        <View style={styles.receiptBlock}>
          <Text style={styles.receiptTitle}>Détail du reçu</Text>
          {commande.panier.lignes.map((ligne: any) => (
            <View key={ligne.id} style={styles.receiptRow}>
              <Text style={styles.receiptQty}>×{ligne.quantite}</Text>
              <Text style={styles.receiptNom} numberOfLines={1}>{ligne.produit?.nom || 'Article'}</Text>
              <Text style={styles.receiptPrix}>{(ligne.prixUnitaire * ligne.quantite).toLocaleString()} FCFA</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.total}>
        Total : <Text style={{ fontFamily: 'monospace' }}>{commande.montantTotal?.toLocaleString()} FCFA</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.gold, marginBottom: 12 },
  track: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.blackCard, borderWidth: 2, borderColor: COLORS.line,
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  dotCurrent: { backgroundColor: COLORS.goldDark, borderColor: COLORS.gold },
  dotText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  line: { flex: 1, height: 2, backgroundColor: COLORS.line },
  lineDone: { backgroundColor: COLORS.gold },
  labels: { flexDirection: 'row', marginTop: 6 },
  labelText: { flex: 1, textAlign: 'center', fontSize: 10, color: COLORS.muted },
  boutiqueBlock: {
    backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line,
    borderRadius: 6, padding: 14, marginTop: 4,
  },
  boutiqueLabel: { color: COLORS.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  boutiqueNom: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  boutiqueAdresse: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  receiptBlock: {
    backgroundColor: COLORS.blackCard, borderWidth: 1, borderColor: COLORS.line,
    borderRadius: 6, padding: 14, marginTop: 12,
  },
  receiptTitle: { color: COLORS.gold, fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  receiptQty: { color: COLORS.muted, fontSize: 13, width: 28 },
  receiptNom: { flex: 1, color: COLORS.white, fontSize: 14 },
  receiptPrix: { color: COLORS.white, fontFamily: 'monospace', fontSize: 13 },
  total: { color: COLORS.gold, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 10 },
});
