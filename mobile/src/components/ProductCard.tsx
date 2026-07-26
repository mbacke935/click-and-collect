import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  nom: string;
  prix: number;
  quantite: number;
  onAdd: () => void;
  onRemove: () => void;
}

export default function ProductCard({ nom, prix, quantite, onAdd, onRemove }: Props) {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nom}>{nom}</Text>
        <Text style={styles.prix}>{prix.toLocaleString()} FCFA</Text>
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.btn} onPress={onRemove}>
          <Text style={styles.btnText}>–</Text>
        </TouchableOpacity>
        <Text style={styles.qty}>{quantite}</Text>
        <TouchableOpacity style={styles.btn} onPress={onAdd}>
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.blackCard,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nom: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  prix: { color: COLORS.muted, fontFamily: 'monospace', fontSize: 13, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: COLORS.goldDark,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  qty: { color: COLORS.white, fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center' },
});
