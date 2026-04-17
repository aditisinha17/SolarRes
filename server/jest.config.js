/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../tests'],
  moduleNameMapper: {
    '^solar-res-shared(.*)$': '<rootDir>/../shared/src$1',
  },
};
