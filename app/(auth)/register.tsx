import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/core/context/ThemeContext';
import { authService } from '@/core/services/authService';
import { useAuth } from '@/core/context/AuthContext';
import { Lock, Mail, User, ArrowRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { loginState } = useAuth();

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!fullname || !email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    // Etape 1: Créer le compte
    const res = await authService.register(fullname, email, password);

    if (res.success) {
      // Etape 2: Se connecter automatiquement après la création
      const loginRes = await authService.login(email, password);
      if (loginRes.success && loginRes.user && loginRes.token) {
        await loginState(loginRes.user, loginRes.token);
        router.replace('/(tabs)');
      } else {
        // En cas d'erreur de login après inscription
        router.replace('/(auth)/login');
      }
    } else {
      setError(res.message || res.error || 'Erreur lors de la création du compte');
    }
    
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Créer un compte</Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>
          Rejoignez Zarabook pour partager et découvrir.
        </Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: '#ef444420', borderColor: '#ef4444' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textMuted }]}>NOM COMPLET</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.05)' }]}>
            <User size={20} color={colors.textMuted} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="John Doe"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={fullname}
              onChangeText={setFullname}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.05)' }]}>
            <Mail size={20} color={colors.textMuted} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="votre@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textMuted }]}>MOT DE PASSE</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.05)' }]}>
            <Lock size={20} color={colors.textMuted} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>S'inscrire</Text>
              <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textDim }]}>
          Déjà un compte ? 
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.footerLink, { color: colors.primary }]}> Se connecter</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  button: {
    height: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '800',
  },
});
