/**
 * Configuration dédiée au parcours par rôle (fichiers `*.integration.test.ts`).
 * Ces tests appellent une API réelle — ils sont exclus de `npm test`.
 */
module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Jest ne sait pas charger les .mjs que Metro résout pour les chemins
    // profonds de Lucide : on le renvoie vers le build CommonJS équivalent.
    '^lucide-react-native/icons/(.*)$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/icons/$1.js',
  },
  testMatch: ['<rootDir>/src/**/*.integration.test.ts'],
  // Les rôles partagent le limiteur anti brute-force du login : en parallèle,
  // les quatre connexions se marchent dessus.
  maxWorkers: 1,
};
