import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {MapPin, X} from '@/components/icons';

import type {Palette} from '@/config/theme';
import {
  ANOMALY_NOTE_MAX,
  REPORT_DONE,
  REPORT_HINTS,
  REPORT_LABELS,
  validateAnomalyNote,
  type ReportKind,
} from '@/domain/anomaly';
import {useTheme} from '@/hooks/useTheme';
import {getCurrentPosition} from '@/services/geo/location';
import {outboxService} from '@/services/sync/outboxService.instance';
import {makeId} from '@/services/util/id';

type Phase = 'idle' | 'locating' | 'saving';

/**
 * Saisie d'un signalement terrain (anomalie, perte ou mise en maintenance).
 *
 * Le GPS est interrogé au moment de la validation, pas à l'ouverture : la
 * position doit être celle du signalement, et on évite de réveiller la puce
 * si l'utilisateur renonce.
 */
export function ReportSheet({
  visible,
  kind,
  itemId,
  onClose,
  onDone,
}: {
  visible: boolean;
  kind: ReportKind;
  itemId: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  const reset = () => {
    setNote('');
    setError(null);
    setPhase('idle');
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    const noteError = validateAnomalyNote(note, kind);
    if (noteError) {
      setError(noteError);
      return;
    }

    setError(null);
    setPhase('locating');
    try {
      // Le GPS fonctionne sans réseau : c'est ce qui rend le signalement
      // possible en zone blanche.
      const location = await getCurrentPosition();
      setPhase('saving');
      const res = outboxService.enqueueReport({
        localId: makeId('rep'),
        itemId,
        kind,
        location,
        note,
        now: new Date().toISOString(),
      });
      if (!res.ok) {
        setError(res.reason);
        setPhase('idle');
        return;
      }
      onDone(REPORT_DONE[kind]);
      close();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Position indisponible : ${e.message}`
          : 'Position indisponible.',
      );
      setPhase('idle');
    }
  };

  const busy = phase !== 'idle';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      {/*
        * Sur iOS, le clavier ne redimensionne pas le contenu d'une modale : il se
        * dessine par-dessus. Sans ce KeyboardAvoidingView, le bandeau — ancré en
        * bas — passait entièrement sous le clavier, masquant à la fois la note et
        * le bouton de validation. Sur Android, `undefined` laisse le système
        * redimensionner la fenêtre lui-même (même convention que LoginScreen).
        */}
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{REPORT_LABELS[kind]}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={close}
              hitSlop={10}
              disabled={busy}>
              <X color={c.textMuted} size={20} strokeWidth={2.5} />
            </Pressable>
          </View>

          <Text style={styles.hint}>{REPORT_HINTS[kind]}</Text>

          <TextInput
            style={styles.input}
            placeholder={
              kind === 'anomaly' ? 'Décrivez l’anomalie (obligatoire)' : 'Note (facultative)'
            }
            placeholderTextColor={c.textMuted}
            multiline
            maxLength={ANOMALY_NOTE_MAX}
            value={note}
            onChangeText={setNote}
            editable={!busy}
          />
          <Text style={styles.counter}>
            {note.trim().length} / {ANOMALY_NOTE_MAX}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            style={[styles.submit, kind === 'lost' && styles.submitDanger, busy && styles.busy]}
            onPress={submit}
            disabled={busy}>
            {busy ? (
              <>
                <ActivityIndicator color={c.onPrimary} />
                <Text style={styles.submitText}>
                  {phase === 'locating' ? 'Localisation…' : 'Enregistrement…'}
                </Text>
              </>
            ) : (
              <>
                <MapPin color={c.onPrimary} size={16} strokeWidth={2.5} />
                <Text style={styles.submitText}>Enregistrer avec ma position</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end'},
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 24,
      paddingBottom: 32,
      gap: 12,
    },
    head: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    title: {color: c.text, fontSize: 17, fontWeight: '700'},
    hint: {color: c.textMuted, fontSize: 14, lineHeight: 18},
    input: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      padding: 12,
      color: c.text,
      minHeight: 96,
      textAlignVertical: 'top',
    },
    counter: {color: c.textMuted, fontSize: 12, textAlign: 'right'},
    error: {color: c.danger, fontSize: 14},
    submit: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    submitDanger: {backgroundColor: c.danger},
    busy: {opacity: 0.7},
    submitText: {color: c.onPrimary, fontWeight: '700'},
  });
