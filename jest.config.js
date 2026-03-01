module.exports = {
  projects: [
    {
      displayName: 'node',
      testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@react-native-async-storage/async-storage$': '<rootDir>/src/__mocks__/async-storage.ts',
      },
    },
    {
      displayName: 'react-native',
      testMatch: ['<rootDir>/src/__tests__/**/*.test.tsx'],
      preset: 'react-native',
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', {
          presets: ['babel-preset-expo'],
        }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
      ],
    },
  ],
};
