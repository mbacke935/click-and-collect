import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  recue: { bg: 'rgba(212,168,67,0.15)', text: COLORS.gold, label: 'Reçue' },
  en_preparation: { bg: 'rgba(212,168,67,0.25)', text: COLORS.goldGlow, label: 'En préparation' },
  prete: { bg: 'rgba(74,222,128,0.12)', text: COLORS.green, label: 'Prête' },
  recuperee: { bg: 'rgba(74,222,128,0.2)', text: COLORS.green, label: 'Récupérée' },
  annulee: { bg: 'rgba(239,68,68,0.12)', text: COLORS.red, label: 'Annulée' },
};

export default function StatusBadge({ statut }: { statut: string }) {
  const config = STATUS_CONFIG[statut] || STATUS_CONFIG.recue;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
