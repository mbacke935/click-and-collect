import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'commercant'>('client');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) return Alert.alert('Erreur', 'Remplissez les champs obligatoires.');
    setLoading(true);
    try {
      await register({ email, password, nom, prenom, role });
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Inscription échouée.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text style={styles.title}>Créer un compte</Text>
      <View style={styles.roleRow}>
        {(['client', 'commercant'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleBtn, role === r && styles.roleBtnActive]}
            onPress={() => setRole(r)}
          >
            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
              {r === 'client' ? 'Client' : 'Commerçant'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Prénom" placeholderTextColor={COLORS.mutedLight} value={prenom} onChangeText={setPrenom} />
      <TextInput style={styles.input} placeholder="Nom" placeholderTextColor={COLORS.mutedLight} value={nom} onChangeText={setNom} />
      <TextInput style={styles.input} placeholder="Adresse e-mail" placeholderTextColor={COLORS.mutedLight} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Mot de passe (8 caractères min.)" placeholderTextColor={COLORS.mutedLight} value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.btnText}>S'inscrire</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Déjà un compte ? <Text style={{ color: COLORS.gold }}>Se connecter</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.gold, marginBottom: 24 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.mutedLight, borderRadius: 20, paddingVertical: 10, alignItems: 'center' },
  roleBtnActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  roleText: { color: COLORS.muted, fontWeight: '600', fontSize: 13 },
  roleTextActive: { color: COLORS.black },
  input: { borderBottomWidth: 1, borderColor: COLORS.mutedLight, color: COLORS.white, fontSize: 14, paddingVertical: 12, marginBottom: 16 },
  btn: { backgroundColor: COLORS.gold, paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  link: { color: COLORS.muted, textAlign: 'center', marginTop: 18, fontSize: 14 },
});
