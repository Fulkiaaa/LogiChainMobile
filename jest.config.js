module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Le parcours par rôle a besoin d'une API vivante : il ne peut pas tourner
  // dans la suite par défaut. `npm run parcours` l'exécute à part.
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
};
