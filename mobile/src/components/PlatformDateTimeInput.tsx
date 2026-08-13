import React, { useState } from 'react';
import { Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../constants/theme';
import { valueToDate, dateToValue } from '../utils/dateTimeValue';

interface Props {
  value: string;
  onChange: (value: string) => void;
  mode: 'date' | 'time';
  placeholder: string;
  style?: any;
}

function formatDisplay(value: string, mode: 'date' | 'time'): string {
  if (!value) return '';
  if (mode === 'time') return value;
  return valueToDate(value, 'date').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// Picker natif (calendrier / roue horaire du système) au lieu d'une saisie libre —
// élimine les erreurs de format (ex. "9:00" au lieu de "09:00") qui bloquaient la
// création de créneau avec l'ancien TextInput. @react-native-community/datetimepicker
// n'a pas d'équivalent web ; voir PlatformDateTimeInput.web.tsx pour cet écran.
export default function PlatformDateTimeInput({ value, onChange, mode, placeholder, style }: Props) {
  const [show, setShow] = useState(false);

  return (
    <>
      <TouchableOpacity style={style} onPress={() => setShow(true)}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDisplay(value, mode) : placeholder}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={valueToDate(value, mode)}
          mode={mode}
          display="default"
          onChange={(event, selected) => {
            setShow(Platform.OS === 'ios' && event.type !== 'set');
            if (event.type === 'set' && selected) {
              onChange(dateToValue(selected, mode));
              if (Platform.OS === 'android') setShow(false);
            }
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  value: { color: COLORS.white, fontSize: 14 },
  placeholder: { color: COLORS.mutedLight, fontSize: 14 },
});
