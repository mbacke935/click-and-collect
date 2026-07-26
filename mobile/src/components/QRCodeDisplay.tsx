import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../constants/theme';

interface Props {
  value: string;
  boutique: string;
  creneau: string;
  code: string;
}

export default function QRCodeDisplay({ value, boutique, creneau, code }: Props) {
  return (
    <View style={styles.ticket}>
      <View style={styles.top}>
        <Text style={styles.boutiqueName}>{boutique}</Text>
        <Text style={styles.creneau}>{creneau}</Text>
        <View style={styles.qrWrap}>
          <QRCode
            value={value}
            size={140}
            backgroundColor={COLORS.blackCard}
            color={COLORS.gold}
          />
        </View>
      </View>
      <View style={styles.perforation} />
      <View style={styles.bottom}>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.hint}>Billet disponible hors-ligne</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: COLORS.blackCard,
    borderWidth: 1,
    borderColor: COLORS.goldDark,
    borderRadius: 10,
    marginVertical: 14,
  },
  top: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 18 },
  boutiqueName: {
    color: COLORS.muted, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 4,
  },
  creneau: { color: COLORS.gold, fontSize: 18, fontWeight: '700' },
  qrWrap: { marginTop: 14 },
  perforation: {
    borderTopWidth: 2, borderStyle: 'dashed',
    borderColor: COLORS.goldDark, marginHorizontal: 14,
  },
  bottom: { padding: 16, alignItems: 'center' },
  code: {
    fontFamily: 'monospace', fontSize: 13,
    letterSpacing: 1, color: COLORS.gold,
  },
  hint: { color: COLORS.muted, fontSize: 12, marginTop: 6 },
});
