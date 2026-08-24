import React, {useMemo, useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput} from 'react-native';

import type {Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {useAuth} from '@/hooks/useAuth';
import {loginInputSchema} from '@/schemas/item.schema';

export function LoginScreen() {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {login} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const parsed = loginInputSchema.safeParse({email, password});
    if (!parsed.success) {
      setError('Email ou mot de passe invalide.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError('Connexion impossible. Vérifiez vos identifiants et le réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>LogiChain</Text>
      <Text style={styles.subtitle}>Terrain</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor={c.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.buttonText}>Se connecter</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', padding: 24, backgroundColor: c.bg},
  title: {fontSize: 40, fontWeight: '800', color: c.text, textAlign: 'center'},
  subtitle: {fontSize: 16, color: c.primary, textAlign: 'center', marginBottom: 32},
  input: {
    backgroundColor: c.surface,
    color: c.text,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  error: {color: c.danger, marginBottom: 12},
  button: {
    backgroundColor: c.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {color: '#0f172a', fontWeight: '700', fontSize: 16},
});
