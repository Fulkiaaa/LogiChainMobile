import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {MapPin, X} from 'lucide-react-native';

import type {Palette} from '@/config/theme';
import {
  ANOMALY_NOTE_MAX,
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
 * Saisie d'un signalement terrain (anomalie ou perte).
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
      onDone(
        kind === 'lost'
          ? 'Perte enregistrée. Elle partira à la prochaine synchro.'
          : 'Anomalie enregistrée. Elle partira à la prochaine synchro.',
      );
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
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{REPORT_LABELS[kind]}</Text>
            <Pressable onPress={close} hitSlop={10} disabled={busy}>
              <X color={c.textMuted} size={20} strokeWidth={2.5} />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            {kind === 'lost'
              ? 'L’équipement passera en « Perdu ». Cet état est définitif.'
              : 'Le statut de l’équipement ne change pas : le signalement est ajouté à son historique.'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={
              kind === 'lost' ? 'Note (facultative)' : 'Décrivez l’anomalie (obligatoire)'
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
      </View>
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
      padding: 20,
      paddingBottom: 34,
      gap: 10,
    },
    head: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    title: {color: c.text, fontSize: 18, fontWeight: '700'},
    hint: {color: c.textMuted, fontSize: 13, lineHeight: 18},
    input: {
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      color: c.text,
      minHeight: 96,
      textAlignVertical: 'top',
    },
    counter: {color: c.textMuted, fontSize: 11, textAlign: 'right', marginTop: -6},
    error: {color: c.danger, fontSize: 13},
    submit: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    submitDanger: {backgroundColor: c.danger},
    busy: {opacity: 0.7},
    submitText: {color: c.onPrimary, fontWeight: '700'},
  });
