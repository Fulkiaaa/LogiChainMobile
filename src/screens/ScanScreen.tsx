import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';

import {ModeSelector} from '@/components/ModeSelector';
import {COLORS} from '@/config/theme';
import {useScanMode} from '@/hooks/useScanMode';
import {useScanner} from '@/hooks/useScanner';
import {outboxRepo} from '@/services/db/database';

export function ScanScreen() {
  const {mode, setMode} = useScanMode();
  const {onCode, sessionCount, lastResults} = useScanner(mode);
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const [manual, setManual] = useState('');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Rafraîchit le compteur outbox après chaque scan de session.
  useEffect(() => {
    setPending(outboxRepo.countPending());
  }, [sessionCount]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'code-128'],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (value) {
        onCode(value);
      }
    },
  });

  return (
    <View style={styles.container}>
      {hasPermission && device ? (
        <Camera style={StyleSheet.absoluteFill} device={device} isActive codeScanner={codeScanner} />
      ) : (
        <View style={styles.noCam}>
          <Text style={styles.noCamText}>
            Caméra indisponible (permission refusée ou simulateur). Utilisez la saisie manuelle.
          </Text>
        </View>
      )}

      <View style={styles.top}>
        <ModeSelector mode={mode} onChange={setMode} />
        <View style={styles.counters}>
          <Text style={styles.count}>{sessionCount} scannés</Text>
          <Text style={styles.pending}>{pending} en attente</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Saisir un QR / code…"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            value={manual}
            onChangeText={setManual}
            onSubmitEditing={() => {
              if (manual.trim()) {
                onCode(manual.trim());
                setManual('');
              }
            }}
          />
          <Pressable
            style={styles.manualBtn}
            onPress={() => {
              if (manual.trim()) {
                onCode(manual.trim());
                setManual('');
              }
            }}>
            <Text style={styles.manualBtnText}>OK</Text>
          </Pressable>
        </View>
        {lastResults.slice(0, 4).map((r, i) => (
          <Text key={i} style={[styles.result, {color: r.ok ? COLORS.success : COLORS.danger}]}>
            {r.ok ? '✓' : '✗'} {r.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  noCam: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', padding: 24, backgroundColor: COLORS.bg},
  noCamText: {color: COLORS.textMuted, textAlign: 'center'},
  top: {position: 'absolute', top: 16, left: 12, right: 12, gap: 8},
  counters: {flexDirection: 'row', justifyContent: 'space-between'},
  count: {color: '#fff', fontSize: 18, fontWeight: '700'},
  pending: {color: COLORS.warning, fontSize: 14, fontWeight: '600'},
  bottom: {position: 'absolute', bottom: 24, left: 12, right: 12, gap: 6},
  manualRow: {flexDirection: 'row', gap: 8, marginBottom: 8},
  manualInput: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    color: COLORS.text,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  manualBtn: {backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center'},
  manualBtnText: {color: '#0f172a', fontWeight: '700'},
  result: {fontSize: 14, fontWeight: '600'},
});
