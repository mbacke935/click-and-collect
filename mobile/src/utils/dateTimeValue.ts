// Conversion entre les valeurs texte utilisées par l'API ('YYYY-MM-DD' pour une date,
// 'HH:mm' pour une heure — mêmes formats que les inputs HTML date/time) et un objet Date,
// nécessaire pour piloter le picker natif (@react-native-community/datetimepicker).

const pad2 = (n: number) => String(n).padStart(2, '0');

export function valueToDate(value: string, mode: 'date' | 'time'): Date {
  const now = new Date();
  if (mode === 'date') {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return now;
    return new Date(y, m - 1, d);
  }
  const [h, min] = value.split(':').map(Number);
  const date = new Date(now);
  date.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(min) ? min : 0, 0, 0);
  return date;
}

export function dateToValue(date: Date, mode: 'date' | 'time'): string {
  if (mode === 'date') {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  }
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
