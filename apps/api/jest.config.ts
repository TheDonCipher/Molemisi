import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // rootDir is 'src' (apps/api/src), so packages live at ../../../packages
  moduleNameMapper: {
    '^@molemisi/shared$': '<rootDir>/../../../packages/shared/src',
    '^@molemisi/game-types$': '<rootDir>/../../../packages/game-types/src',
    '^@molemisi/game-config$': '<rootDir>/../../../packages/game-config/src',
    '^@molemisi/validation$': '<rootDir>/../../../packages/validation/src',
  },
};

export default config;
