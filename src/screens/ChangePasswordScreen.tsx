import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import type {Palette} from '@/config/theme';
import {
  PASSWORD_RULES,
  validatePasswordChange,
  type PasswordChangeErrors,
} from '@/domain/passwordChange';
import {useAuth} from '@/hooks/useAuth';
import {useTheme} from '@/hooks/useTheme';

/**
 * Écran imposé à la première connexion d'un compte créé par un admin.
 *
 * Sans issue volontairement : pas de retour, pas d'onglets — l'API refuse de
 * toute façon toute route métier tant que le mot de passe temporaire est en
 * place (403 PASSWORD_CHANGE_REQUIRED). La seule sortie est la déconnexion.
 */
export function ChangePasswordScreen() {
  const {c} = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {changePassword, logout, user} = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<PasswordChangeErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setServerError(null);
    const found = validatePasswordChange({currentPassword, newPassword, confirmPassword});
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      // Pas de navigation ici : le changement de statut dans useAuth fait
      // basculer RootNavigator vers l'application.
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Changement impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, {paddingTop: insets.top + 32}]}>
        <Text style={styles.title}>Choisis ton mot de passe</Text>
        <Text style={styles.subtitle}>
          Ton compte a été créé avec un mot de passe temporaire. Remplace-le pour accéder à
          l'application.
        </Text>
        {user ? <Text style={styles.account}>{user.email}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Mot de passe temporaire"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        {errors.currentPassword ? <Text style={styles.error}>{errors.currentPassword}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Nouveau mot de passe"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        {/*
          * Critères affichés en permanence et cochés à la frappe, plutôt qu'une
          * erreur après validation : l'utilisateur sait ce qu'on attend avant
          * d'échouer, au lieu de le découvrir par tâtonnement.
          */}
        <View style={styles.rules}>
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(newPassword);
            return (
              <Text
                key={rule.label}
                style={[styles.rule, met ? styles.ruleMet : null]}>
                {met ? '✓' : '○'}  {rule.label}
              </Text>
            );
          })}
        </View>
        {errors.newPassword ? <Text style={styles.error}>{errors.newPassword}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Confirme le nouveau mot de passe"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}

        {serverError ? <Text style={styles.error}>{serverError}</Text> : null}

        <Pressable
            accessibilityRole="button" style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Valider</Text>
          )}
        </Pressable>

        <Pressable
            accessibilityRole="button" style={styles.linkButton} onPress={logout} disabled={loading}>
          <Text style={styles.linkText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: c.bg},
    content: {padding: 24, paddingBottom: 48},
    title: {fontSize: 26, fontWeight: '800', color: c.text},
    subtitle: {fontSize: 14, color: c.textMuted, marginTop: 8, marginBottom: 4, lineHeight: 21},
    account: {fontSize: 14, color: c.primary, marginBottom: 24},
    input: {
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    rules: {marginBottom: 12, marginTop: 4, gap: 4},
    rule: {color: c.textMuted, fontSize: 14},
    ruleMet: {color: c.primary},
    error: {color: c.danger, marginBottom: 8},
    button: {
      backgroundColor: c.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    buttonText: {color: c.onPrimary, fontWeight: '700', fontSize: 17},
    linkButton: {padding: 16, alignItems: 'center'},
    linkText: {color: c.textMuted, fontSize: 14},
  });
