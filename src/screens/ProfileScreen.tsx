import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {LogOut, Mail, Monitor, Moon, ShieldCheck, Sun, UserPlus} from 'lucide-react-native';

import type {Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import type {ThemeMode} from '@/domain/theme';
import {
  ROLE_LABELS,
  canManageUsers,
  validateNewUser,
  type NewUserErrors,
} from '@/domain/roles';
import {useAuth} from '@/hooks/useAuth';
import {authApi} from '@/services/api/auth.api';
import type {UserRole} from '@/types/api';

const CREATABLE_ROLES: UserRole[] = ['field_agent', 'logistics_manager', 'transporter', 'admin'];

const THEME_OPTIONS: {key: ThemeMode; label: string; Icon: typeof Sun}[] = [
  {key: 'auto', label: 'Système', Icon: Monitor},
  {key: 'light', label: 'Clair', Icon: Sun},
  {key: 'dark', label: 'Sombre', Icon: Moon},
];

export function ProfileScreen() {
  const {c, mode, setMode} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {user, logout} = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <Text style={styles.section}>Compte</Text>
      <View style={styles.card}>
        <View style={styles.line}>
          <Mail color={c.textMuted} size={16} strokeWidth={2} />
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
        </View>
        <View style={styles.line}>
          <ShieldCheck color={c.primary} size={16} strokeWidth={2} />
          <Text style={styles.value}>{user ? ROLE_LABELS[user.role] : '—'}</Text>
        </View>
      </View>

      <Text style={styles.section}>Apparence</Text>
      <View style={styles.card}>
        <View style={styles.roleRow}>
          {THEME_OPTIONS.map(({key, label, Icon}) => {
            const active = key === mode;
            return (
              <Pressable
                key={key}
                onPress={() => setMode(key)}
                style={[styles.themeChip, active && styles.roleChipActive]}>
                <Icon color={active ? c.onPrimary : c.textMuted} size={15} strokeWidth={2} />
                <Text style={[styles.roleText, active && styles.roleTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {canManageUsers(user?.role) ? <AdminSection /> : null}

      <Pressable style={styles.logout} onPress={logout}>
        <LogOut color={c.danger} size={16} strokeWidth={2} />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </Pressable>

      <Text style={styles.note}>
        La modification de l'email et du mot de passe n'est pas disponible : l'API ne l'expose pas.
      </Text>
    </ScrollView>
  );
}

/** Visible uniquement pour un admin — miroir de `requireRole('admin')` sur
 *  `POST /auth/register`. */
function AdminSection() {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('field_agent');
  const [errors, setErrors] = useState<NewUserErrors>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const found = validateNewUser({email, password, fullName});
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setBusy(true);
    try {
      const created = await authApi.register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
      });
      Alert.alert('Utilisateur créé', `${created.email} · ${ROLE_LABELS[created.role]}`);
      setEmail('');
      setFullName('');
      setPassword('');
    } catch (e) {
      Alert.alert('Échec', e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={styles.section}>Administration</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Créer un utilisateur</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Nom complet"
          placeholderTextColor={c.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />
        {errors.fullName ? <Text style={styles.error}>{errors.fullName}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Mot de passe (8 caractères min.)"
          placeholderTextColor={c.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

        <View style={styles.roleRow}>
          {CREATABLE_ROLES.map(r => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={[styles.roleChip, r === role && styles.roleChipActive]}>
              <Text style={[styles.roleText, r === role && styles.roleTextActive]}>
                {ROLE_LABELS[r]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.submit, busy && {opacity: 0.6}]} disabled={busy} onPress={submit}>
          {busy ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <>
              <UserPlus color={c.onPrimary} size={16} strokeWidth={2.5} />
              <Text style={styles.submitText}>Créer</Text>
            </>
          )}
        </Pressable>
      </View>
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {flex: 1, backgroundColor: c.bg},
  section: {
    color: c.textMuted,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  card: {backgroundColor: c.surface, borderRadius: 12, padding: 14, gap: 10},
  cardTitle: {color: c.text, fontWeight: '700', marginBottom: 2},
  line: {flexDirection: 'row', alignItems: 'center', gap: 10},
  value: {color: c.text, fontSize: 15, flexShrink: 1},
  input: {
    backgroundColor: c.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.text,
  },
  error: {color: c.danger, fontSize: 12, marginTop: -4},
  roleRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2},
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  roleChipActive: {backgroundColor: c.primary, borderColor: c.primary},
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  roleText: {color: c.textMuted, fontSize: 12, fontWeight: '600'},
  roleTextActive: {color: c.onPrimary},
  submit: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitText: {color: c.onPrimary, fontWeight: '700'},
  logout: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.danger,
  },
  logoutText: {color: c.danger, fontWeight: '700'},
  note: {color: c.textMuted, fontSize: 12, marginTop: 16, textAlign: 'center'},
});
