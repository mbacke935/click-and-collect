import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { COLORS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={COLORS.mutedLight} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {visible ? (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <Circle cx={12} cy={12} r={3} />
        </>
      ) : (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <Line x1={1} y1={1} x2={23} y2={23} />
        </>
      )}
    </Svg>
  );
}

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Mot de passe"
            placeholderTextColor={COLORS.mutedLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <EyeIcon visible={showPassword} />
          </TouchableOpacity>
        </View>
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
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderColor: COLORS.mutedLight, marginBottom: 16,
  },
  passwordInput: {
    flex: 1, color: COLORS.white, fontSize: 14, paddingVertical: 12,
  },
  eyeButton: { padding: 8 },
  btn: {
    backgroundColor: COLORS.gold, paddingVertical: 14,
    borderRadius: 6, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: COLORS.black, fontWeight: '700', fontSize: 15 },
  link: { color: COLORS.muted, textAlign: 'center', marginTop: 18, fontSize: 14 },
});
