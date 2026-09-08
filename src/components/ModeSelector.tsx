import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Lock, MapPin, PackageCheck, Truck} from '@/components/icons';

import {TOUCH_MIN, OVERLAY} from '@/config/theme';

import type {ScanMode} from '@/domain/scanAction';
import {can, whyNot} from '@/domain/capabilities';
import type {AppCapability} from '@/domain/capabilities';
import type {UserRole} from '@/types/api';

/**
 * `capability` fait le lien entre un mode de scan et le geste correspondant
 * côté API. `pointage` déclenche `POST /items/:id/scan`, ouvert à tous.
 */
const MODES: {key: ScanMode; label: string; Icon: typeof MapPin; capability: AppCapability}[] = [
  {key: 'deploy', label: 'Déploiement', Icon: PackageCheck, capability: 'deploy'},
  {key: 'transit', label: 'Transit', Icon: Truck, capability: 'transit'},
  {key: 'pointage', label: 'Pointage', Icon: MapPin, capability: 'scan'},
];

export function ModeSelector({
  mode,
  role,
  onChange,
}: {
  mode: ScanMode;
  role: UserRole | null | undefined;
  onChange: (m: ScanMode) => void;
}) {

  /*
   * On affiche UNE raison, pas une par mode : avec un seul geste restreint
   * aujourd'hui, une liste ferait du bruit pour rien. La première suffit.
   */
  const refus = MODES.map((m) => whyNot(role, m.capability)).find((r) => r !== null) ?? null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {MODES.map(({key, label, Icon, capability}) => {
          const autorise = can(role, capability);
          const active = key === mode && autorise;
          const tint = active ? OVERLAY.onPrimary : autorise ? OVERLAY.text : OVERLAY.textMuted;
          return (
            <Pressable
              key={key}
              testID={`mode-${key}`}
              accessibilityRole="button"
              accessibilityState={{disabled: !autorise}}
              accessibilityLabel={
                autorise ? label : `${label} — indisponible pour votre rôle`
              }
              // Le mode reste pressable pour rester focusable et lisible ; c'est
              // le handler qui refuse. Un Pressable `disabled` est ignoré par
              // VoiceOver, l'utilisateur ne saurait même pas que le mode existe.
              onPress={() => {
                if (autorise) {
                  onChange(key);
                }
              }}
              style={[
                styles.chip,
                active && styles.chipActive,
                !autorise && styles.chipLocked,
              ]}>
              {autorise ? (
                <Icon color={tint} size={16} strokeWidth={2} />
              ) : (
                <Lock color={OVERLAY.textMuted} size={14} strokeWidth={2.5} />
              )}
              <Text
                style={[
                  styles.label,
                  active && styles.labelActive,
                  !autorise && styles.labelLocked,
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {refus ? <Text style={styles.reason}>{refus}</Text> : null}
    </View>
  );
}

/*
 * Couleurs FIXES, pas celles du thème : ces boutons sont posés sur l'aperçu
 * caméra. En thème clair, `c.text` vaut presque noir et disparaissait sur le
 * voile sombre — le mode « Transit », pourtant disponible, était illisible dans
 * une salle sombre. `contrast.test.ts` vérifie chaque couleur sur les deux
 * extrêmes que l'objectif peut renvoyer.
 */
const styles = StyleSheet.create({
  wrap: {gap: 6},
  row: {flexDirection: 'row', gap: 8},
  chip: {
    flex: 1,
    minHeight: TOUCH_MIN,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: OVERLAY.scrim,
    borderWidth: 1,
    borderColor: OVERLAY.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {backgroundColor: OVERLAY.primary, borderColor: OVERLAY.primary},
  // Verrouillé : pointillés plutôt qu'une simple baisse d'opacité, qui se lit
  // même en niveaux de gris. Le voile est CONSERVÉ — le rendre transparent
  // laissait le libellé seul sur l'image, donc invisible sur un fond sombre.
  chipLocked: {
    backgroundColor: OVERLAY.scrim,
    borderStyle: 'dashed',
    borderColor: OVERLAY.textMuted,
  },
  label: {color: OVERLAY.text, fontWeight: '600', fontSize: 13},
  labelActive: {color: OVERLAY.onPrimary},
  labelLocked: {color: OVERLAY.textMuted, fontWeight: '500'},
  reason: {
    color: OVERLAY.warning,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: OVERLAY.scrim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
});
