/**
 * Unit tests for the API. `ts-jest` compiles in-memory, so a spec runs against the source
 * and not against `dist/` — but `@rgi/types` is consumed as a built package, so
 * `npm run build --workspace=@rgi/types` must have run at least once (the `prebuild` and
 * `predev` scripts already do it).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
};
