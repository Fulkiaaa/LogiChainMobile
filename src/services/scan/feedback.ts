import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Sound from 'react-native-sound';

Sound.setCategory('Ambient');

/**
 * Charge un son du bundle de façon tolérante : si l'asset n'est pas présent,
 * on garde le retour haptique seul (le scan reste utilisable sans son).
 */
function loadSound(file: string): Sound | null {
  let s: Sound | null = null;
  s = new Sound(file, Sound.MAIN_BUNDLE, error => {
    if (error) {
      s = null;
    }
  });
  return s;
}

const okSound = loadSound('beep_ok.wav');
const koSound = loadSound('beep_ko.wav');

function play(s: Sound | null) {
  if (s) {
    s.stop(() => s.play());
  }
}

/** Confirmation d'un scan réussi : vibration légère + bip aigu. */
export function feedbackSuccess(): void {
  ReactNativeHapticFeedback.trigger('impactLight');
  play(okSound);
}

/** Rejet d'un scan (inconnu ou transition interdite) : double vibration + bip grave. */
export function feedbackReject(): void {
  ReactNativeHapticFeedback.trigger('notificationError');
  play(koSound);
}
