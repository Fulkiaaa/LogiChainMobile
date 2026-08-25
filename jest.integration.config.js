/**
 * Configuration dédiée au parcours par rôle (fichiers `*.integration.test.ts`).
 * Ces tests appellent une API réelle — ils sont exclus de `npm test`.
 */
module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.integration.test.ts'],
  // Les rôles partagent le limiteur anti brute-force du login : en parallèle,
  // les quatre connexions se marchent dessus.
  maxWorkers: 1,
};
