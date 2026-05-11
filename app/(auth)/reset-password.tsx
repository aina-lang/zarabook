import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/core/context/ThemeContext';
import { authService } from '@/core/services/authService';
import { Lock, KeyRound, ArrowRight, ArrowLeft } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string || '';

  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNextStep = () => {
    if (otp.length < 6) {
      setError('Veuillez entrer un code OTP valide (6 chiffres)');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleReset = async () => {
    if (!otp || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    const res = await authService.resetPassword(email, otp, password);

    if (res.success) {
      Alert.alert(
        "Succès",
        "Votre mot de passe a été réinitialisé avec succès.",
        [{ text: "Se connecter", onPress: () => router.replace('/(auth)/login') }]
      );
    } else {
      setError(res.message || 'Erreur lors de la réinitialisation');
      // Si l'OTP est invalide, on peut renvoyer l'utilisateur à l'étape 1
      if (res.message?.toLowerCase().includes('invalide') || res.message?.toLowerCase().includes('expiré')) {
        setStep(1);
      }
    }
    
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TouchableOpacity onPress={() => step === 2 ? setStep(1) : router.back()} style={styles.backButton}>
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {step === 1 ? 'Vérification 🔐' : 'Nouveau mot de passe 🔑'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>
          {step === 1 
            ? `Un code à 6 chiffres a été envoyé à ${email}.`
            : 'Choisissez un nouveau mot de passe sécurisé.'}
        </Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: '#ef444420', borderColor: '#ef4444' }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {step === 1 && (
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textMuted }]}>CODE OTP</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.05)' }]}>
              <KeyRound size={20} color={colors.textMuted} style={styles.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textMuted }]}>NOUVEAU MOT DE PASSE</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: 'rgba(255,255,255,0.05)' }]}>
              <Lock size={20} color={colors.textMuted} style={styles.icon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoFocus
              />
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={step === 1 ? handleNextStep : handleReset}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>
                {step === 1 ? 'Continuer' : 'Réinitialiser'}
              </Text>
              <ArrowRight size={20} color="#fff" strokeWidth={2.5} />
            </>
          )}
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    marginBottom: 40,
    marginTop: 40,
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
    letterSpacing: 2,
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
});
