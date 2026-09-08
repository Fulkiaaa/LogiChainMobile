import React, {useMemo, useRef, useState} from 'react';
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
import {useScrollToTop} from '@react-navigation/native';
import {LogOut, Mail, Monitor, Moon, ShieldCheck, Sun, UserPlus} from '@/components/icons';

import {TOUCH_MIN, type Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import type {ThemeMode} from '@/domain/theme';
import {
  ROLE_LABELS,
  canManageUsers,
  validateNewUser,
  type NewUserErrors,
} from '@/domain/roles';
import {RolePermissions} from '@/components/RolePermissions';
import {useAuth} from '@/hooks/useAuth';
import {authApi} from '@/services/api/auth.api';
import {outboxRepo} from '@/services/db/database';
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

  /*
   * Un appui sur l'onglet déjà actif ramène la liste en haut : comportement
   * standard iOS/Android, fourni par React Navigation. Le hook n'agit que si
   * l'écran est déjà au premier plan — il n'interfère pas avec la navigation.
   */
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  /**
   * Se déconnecter sur le terrain n'est pas anodin : sans réseau, impossible de
   * se reconnecter avant de retrouver du signal. Et si des actions attendent
   * encore dans la file, l'agent doit savoir ce qu'il laisse derrière lui.
   */
  const confirmerDeconnexion = () => {
    const enAttente = outboxRepo.countPending();
    Alert.alert(
      'Se déconnecter ?',
      enAttente > 0
        ? `${enAttente} action(s) attendent encore d’être synchronisées. Elles resteront enregistrées sur ce terminal, mais ne partiront qu’à la prochaine connexion d’un agent.\n\nSans réseau, la reconnexion sera impossible.`
        : 'Sans réseau, la reconnexion sera impossible avant de retrouver du signal.',
      [
        {text: 'Rester connecté', style: 'cancel'},
        {text: 'Se déconnecter', style: 'destructive', onPress: () => void logout()},
      ],
    );
  };

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={{padding: 16}}>
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

      <Text style={styles.section}>Permissions</Text>
      <View style={styles.card}>
        <RolePermissions role={user?.role} />
      </View>

      <Text style={styles.section}>Apparence</Text>
      <View style={styles.card}>
        <View style={styles.roleRow}>
          {THEME_OPTIONS.map(({key, label, Icon}) => {
            const active = key === mode;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{selected: active}}
                accessibilityLabel={`Thème ${label}`}
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Déconnexion"
        style={styles.logout}
        onPress={confirmerDeconnexion}>
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
              accessibilityRole="button"
              accessibilityState={{selected: r === role}}
              onPress={() => setRole(r)}
              style={[styles.roleChip, r === role && styles.roleChipActive]}>
              <Text style={[styles.roleText, r === role && styles.roleTextActive]}>
                {ROLE_LABELS[r]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
            accessibilityRole="button" style={[styles.submit, busy && {opacity: 0.6}]} disabled={busy} onPress={submit}>
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
  card: {backgroundColor: c.surface, borderRadius: 12, padding: 16, gap: 12},
  cardTitle: {color: c.text, fontWeight: '700', marginBottom: 4},
  line: {flexDirection: 'row', alignItems: 'center', gap: 12},
  value: {color: c.text, fontSize: 14, flexShrink: 1},
  input: {
    backgroundColor: c.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: c.text,
  },
  error: {color: c.danger, fontSize: 12},
  roleRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  roleChip: {
    minHeight: TOUCH_MIN, justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  roleChipActive: {backgroundColor: c.primary, borderColor: c.primary},
  themeChip: {
    minHeight: TOUCH_MIN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  roleText: {color: c.textMuted, fontSize: 12, fontWeight: '600'},
  roleTextActive: {color: c.onPrimary},
  submit: {
    minHeight: TOUCH_MIN,
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
    minHeight: TOUCH_MIN,
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
