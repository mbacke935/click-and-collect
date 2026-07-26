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
          boutique={commande.boutique_id.substring(0, 8)}
          creneau={commande.creneau ? `${commande.creneau.jour} · ${commande.creneau.heureDebut}–${commande.creneau.heureFin}` : ''}
          code={`N° ${commande.id.substring(0, 4).toUpperCase()}`}
        />
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
  total: { color: COLORS.gold, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 10 },
});
