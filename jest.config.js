module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Jest ne sait pas charger les .mjs que Metro résout pour les chemins
    // profonds de Lucide : on le renvoie vers le build CommonJS équivalent.
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
  // Le parcours par rôle a besoin d'une API vivante : il ne peut pas tourner
  // dans la suite par défaut. `npm run parcours` l'exécute à part.
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
};
