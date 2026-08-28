import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Check, Lock} from '@/components/icons';

import type {Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {ALL_CAPABILITIES, CAPABILITY_LABELS, can, whyNot} from '@/domain/capabilities';
import type {UserRole} from '@/types/api';

/**
 * Le parcours du rôle, affiché dans l'app. On liste TOUS les gestes, pas
 * seulement ceux permis : un utilisateur qui ne voit que ses droits ne sait pas
 * ce qui existe ailleurs, ni à qui demander. Chaque refus porte sa raison.
 */
export function RolePermissions({role}: {role: UserRole | null | undefined}) {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Ce que votre rôle autorise</Text>
      {ALL_CAPABILITIES.map((cap) => {
        const autorise = can(role, cap);
        const raison = whyNot(role, cap);
        return (
          <View
            key={cap}
            testID={`cap-${cap}`}
            accessibilityState={{disabled: !autorise}}
            accessibilityLabel={`${CAPABILITY_LABELS[cap]} — ${
              autorise ? 'autorisé' : 'non autorisé'
            }`}
            style={styles.row}>
            <View style={styles.icon}>
              {autorise ? (
                <Check color={c.success} size={16} strokeWidth={3} />
              ) : (
                <Lock color={c.textMuted} size={14} strokeWidth={2.5} />
              )}
            </View>
            <View style={styles.texts}>
              <Text style={[styles.label, !autorise && styles.labelLocked]}>
                {CAPABILITY_LABELS[cap]}
              </Text>
              {raison ? <Text style={styles.reason}>{raison}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {gap: 8, marginTop: 4},
    title: {color: c.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase'},
    row: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
    icon: {width: 20, alignItems: 'center', paddingTop: 4},
    texts: {flex: 1, gap: 4},
    label: {color: c.text, fontSize: 14, fontWeight: '600'},
    // Barré plutôt que simplement grisé : lisible même en niveaux de gris et
    // pour un daltonien, contrairement à un simple contraste de couleur.
    labelLocked: {color: c.textMuted, fontWeight: '500', textDecorationLine: 'line-through'},
    reason: {color: c.warning, fontSize: 12, fontWeight: '600'},
  });
