import React, {useMemo} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {RotateCcw, X} from '@/components/icons';

import {TOUCH_MIN, CATEGORY_LABELS, type Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {DEFAULT_SORT, type ItemSort} from '@/domain/itemFilter';
import {ITEM_CATEGORIES, type ItemCategory} from '@/types/api';

export interface FilterState {
  category: ItemCategory | null;
  sort: ItemSort;
}

const SORTS: {key: ItemSort; label: string}[] = [
  {key: 'label', label: 'Libellé A-Z'},
  {key: 'status', label: 'Statut'},
  {key: 'recent', label: 'Plus récent'},
];

export function FilterSheet({
  visible,
  category,
  sort,
  onChange,
  onClose,
}: {
  visible: boolean;
  category: ItemCategory | null;
  sort: ItemSort;
  onChange: (next: FilterState) => void;
  onClose: () => void;
}) {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const filtre = category !== null || sort !== DEFAULT_SORT;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/*
        * L'appui sur le fond ferme : geste attendu sur un bandeau iOS.
        *
        * `accessible={false}` : ce n'est pas un bouton. Annoncé comme tel, il
        * offrirait à VoiceOver une cible plein écran sans libellé utile, en
        * doublon du « Fermer » explicite de l'en-tête.
        */}
      <Pressable accessible={false} style={styles.backdrop} onPress={onClose}>
        {/* Ce Pressable interne absorbe l'appui pour qu'un toucher DANS le
            bandeau ne le referme pas. */}
        <Pressable
          accessible={false}
          // Retient le focus VoiceOver dans le bandeau : sans cela, le lecteur
          // continue de parcourir la liste d'équipements restée derrière.
          accessibilityViewIsModal
          style={styles.sheet}
          onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtrer et trier</Text>
            <View style={styles.headerActions}>
              {filtre ? (
                <Pressable
                  testID="filter-reset"
                  accessibilityRole="button"
                  accessibilityLabel="Réinitialiser les filtres"
                  hitSlop={8}
                  style={styles.reset}
                  onPress={() => onChange({category: null, sort: DEFAULT_SORT})}>
                  <RotateCcw color={c.primary} size={15} strokeWidth={2.5} />
                  <Text style={styles.resetText}>Réinitialiser</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                style={styles.close}
                onPress={onClose}>
                <X color={c.textMuted} size={20} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
            <Text style={styles.section}>Catégorie</Text>
            <View style={styles.chips}>
              <Chip
                testID="cat-all"
                label="Toutes"
                active={category === null}
                onPress={() => onChange({category: null, sort})}
                styles={styles}
              />
              {ITEM_CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  testID={`cat-${cat}`}
                  label={CATEGORY_LABELS[cat]}
                  active={category === cat}
                  // Rappuyer sur la catégorie active l'annule : sinon il faut
                  // aller rechercher « Toutes » pour revenir en arrière.
                  onPress={() => onChange({category: category === cat ? null : cat, sort})}
                  styles={styles}
                />
              ))}
            </View>

            <Text style={styles.section}>Trier par</Text>
            <View style={styles.chips}>
              {SORTS.map((s) => (
                <Chip
                  key={s.key}
                  testID={`sort-${s.key}`}
                  label={s.label}
                  active={sort === s.key}
                  // Pas de bascule ici : il faut toujours un tri actif.
                  onPress={() => onChange({category, sort: s.key})}
                  styles={styles}
                />
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({
  testID,
  label,
  active,
  onPress,
  styles,
}: {
  testID: string;
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end'},
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingTop: 16,
      paddingBottom: 32,
      // Plafonné : avec dix catégories et trois tris, le bandeau couvrirait
      // presque tout l'écran sur un petit iPhone.
      maxHeight: '75%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    headerActions: {flexDirection: 'row', alignItems: 'center', gap: 16},
    title: {color: c.text, fontSize: 17, fontWeight: '700'},
    // Une croix de 20 px reste une croix de 20 px : sur un bouton-icône,
    // c'est la LARGEUR qui bloque, pas la hauteur. D'où le carré explicite,
    // qui remplace le `hitSlop` qu'il fallait deviner à la lecture.
    close: {
      minWidth: TOUCH_MIN,
      minHeight: TOUCH_MIN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reset: {minHeight: TOUCH_MIN, flexDirection: 'row', alignItems: 'center', gap: 4},
    resetText: {color: c.primary, fontSize: 14, fontWeight: '600'},
    scroll: {paddingHorizontal: 16},
    scrollBody: {paddingBottom: 8},
    section: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 8,
    },
    chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    chip: {
    minHeight: TOUCH_MIN, justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    chipActive: {backgroundColor: c.primary, borderColor: c.primary},
    chipText: {color: c.text, fontSize: 14, fontWeight: '600'},
    chipTextActive: {color: c.onPrimary},
  });
