import {useEffect, useState} from 'react';
import {Keyboard, Platform} from 'react-native';

/**
 * Hauteur du clavier à l'écran, 0 quand il est fermé.
 *
 * iOS émet `keyboardWillShow` AVANT l'animation d'ouverture : s'y abonner fait
 * remonter la barre de saisie en même temps que le clavier, au lieu de la voir
 * sauter une fois celui-ci en place. Android n'a que les événements `Did`.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, e => {
      setHeight(e.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return height;
}
