import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Sound from 'react-native-sound';

/**
 * « Playback » et non « Ambient » : en Ambient, le bip est coupé par
 * l'interrupteur silencieux du téléphone. Un scanner de terrain doit être
 * audible même sonnerie coupée, sinon le retour sonore ne sert à rien.
 * `true` = mixé avec l'audio déjà en cours (on ne coupe pas la musique).
 */
Sound.setCategory('Playback', true);

/**
 * Charge un son du bundle de façon tolérante. Le chargement est asynchrone :
 * on garde une référence mutable pour pouvoir l'invalider si le fichier
 * manque, sinon le scan resterait utilisable mais silencieux.
 */
function loadSound(file: string): {current: Sound | null} {
  const ref: {current: Sound | null} = {current: null};
  const sound = new Sound(file, Sound.MAIN_BUNDLE, error => {
    ref.current = error ? null : sound;
  });
  return ref;
}

const okSound = loadSound('beep_ok.wav');
const koSound = loadSound('beep_ko.wav');

function play(ref: {current: Sound | null}) {
  const s = ref.current;
  if (!s) {
    return;
  }
  // stop() avant play() pour que les scans en rafale redéclenchent le bip
  // au lieu de l'ignorer pendant qu'il joue encore.
  s.stop(() => s.play());
}

/** Confirmation d'un scan réussi : vibration légère + bip aigu montant. */
export function feedbackSuccess(): void {
  ReactNativeHapticFeedback.trigger('impactLight');
  play(okSound);
}

/** Rejet d'un scan (inconnu ou transition interdite) : double vibration + bip grave. */
export function feedbackReject(): void {
  ReactNativeHapticFeedback.trigger('notificationError');
  play(koSound);
}
