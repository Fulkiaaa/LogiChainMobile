import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';

import {useIsFocused} from '@react-navigation/native';
import {useBottomTabBarHeight} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ModeSelector} from '@/components/ModeSelector';
import {OVERLAY, type Palette} from '@/config/theme';
import {useAuth} from '@/hooks/useAuth';
import {useTheme} from '@/hooks/useTheme';
import {useScanMode} from '@/hooks/useScanMode';
import {useScanner} from '@/hooks/useScanner';
import {useKeyboardHeight} from '@/hooks/useKeyboardHeight';
import {inputBottomOffset} from '@/domain/keyboard';
import {outboxRepo} from '@/services/db/database';

export function ScanScreen() {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {user} = useAuth();
  const {mode, setMode} = useScanMode();
  // Le clavier recouvrait la barre de saisie : elle est en position absolue,
  // rien ne la pousse. On la remonte nous-mêmes.
  const keyboardHeight = useKeyboardHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const {onCode, sessionCount, lastResults} = useScanner(mode);
  const {hasPermission, requestPermission} = useCameraPermission();
  // La caméra ne tourne que si l'onglet Scan est au premier plan : sinon elle
  // continuait de lire les QR depuis un autre onglet, et vidait la batterie.
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
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
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused}
          codeScanner={codeScanner}
        />
      ) : (
        <View style={styles.noCam}>
          <Text style={styles.noCamText}>
            Caméra indisponible (permission refusée ou simulateur). Utilisez la saisie manuelle.
          </Text>
        </View>
      )}

      <View style={[styles.top, {paddingTop: insets.top + 8}]}>
        <ModeSelector mode={mode} role={user?.role} onChange={setMode} />
        <View style={styles.counters}>
          <Text style={styles.count}>{sessionCount} scannés</Text>
          <Text style={styles.pending}>{pending} en attente</Text>
        </View>
      </View>

      <View
        style={[
          styles.bottom,
          {bottom: inputBottomOffset({keyboardHeight, tabBarHeight, base: 24})},
        ]}>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Saisir un QR / code…"
            placeholderTextColor={OVERLAY.textMuted}
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
          <Text key={i} style={[styles.result, {color: r.ok ? OVERLAY.success : OVERLAY.danger}]}>
            {r.ok ? '✓' : '✗'} {r.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  noCam: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', padding: 24, backgroundColor: c.bg},
  noCamText: {color: c.textMuted, textAlign: 'center'},
  top: {position: 'absolute', top: 16, left: 12, right: 12, gap: 8},
  counters: {flexDirection: 'row', justifyContent: 'space-between'},
  count: {color: OVERLAY.text, fontSize: 18, fontWeight: '700'},
  pending: {color: OVERLAY.warning, fontSize: 14, fontWeight: '600'},
  // `bottom` est piloté à l'affichage : il suit l'ouverture du clavier.
  bottom: {position: 'absolute', left: 12, right: 12, gap: 6},
  manualRow: {flexDirection: 'row', gap: 8, marginBottom: 8},
  manualInput: {
    flex: 1,
    backgroundColor: OVERLAY.scrimStrong,
    color: OVERLAY.text,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: OVERLAY.border,
  },
  manualBtn: {backgroundColor: OVERLAY.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center'},
  manualBtnText: {color: OVERLAY.onPrimary, fontWeight: '700'},
  result: {fontSize: 14, fontWeight: '600'},
});
