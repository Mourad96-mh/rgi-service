module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module' },
  env: { node: true, jest: true },
  ignorePatterns: ['dist', 'node_modules'],
};
