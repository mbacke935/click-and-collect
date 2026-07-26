import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Erreur', 'Remplissez tous les champs.');
    setLoading(true);
    try {
      await login({ email, password });
    } catch (e: any) {
      Alert.alert('Erreur', e.response?.data?.message || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Click&Collect</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.subtitle}>Le comptoir de vos commerçants, dans votre poche.</Text>
        <TextInput
          style={styles.input}
          placeholder="Adresse e-mail"
          placeholderTextColor={COLORS.mutedLight}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor={COLORS.mutedLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.btnText}>Se connecter</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>
            Pas encore de compte ? <Text style={{ color: COLORS.gold }}>Créer un compte</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  hero: {
    height: 200, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.blackSoft,
  },
  heroTitle: { fontSize: 28, fontWeight: '700', color: COLORS.gold },
  form: { flex: 1, padding: 24, justifyContent: 'center' },
  subtitle: { color: COLORS.muted, textAlign: 'center', marginBottom: 28, fontSize: 14 },
  input: {
    borderBottomWidth: 1, borderColor: COLORS.mutedLight,
    color: COLORS.white, fontSize: 14, paddingVertical: 12, marginBottom: 16,
  },
  btn: {
    backgroundColor: COLORS.gold, paddingVertical: 14,
    borderRadius: 6, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  link: { color: COLORS.muted, textAlign: 'center', marginTop: 18, fontSize: 14 },
});
