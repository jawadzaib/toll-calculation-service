module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    indent: ['error', 2, { SwitchCase: 1 }],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single', { avoidEscape: true }], // Enforce single quotes
    semi: ['error', 'always'], // Require semicolons at the end of statements

    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'no-extra-semi': 'error',
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
    'arrow-spacing': ['error', { before: true, after: true }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': [
      'error',
      {
        types: {
          '{}': {
            message:
              'Use `object` instead for any non-primitive value, `unknown` for any value, or `Record<string, never>` for an empty object.',
            fixWith: 'object',
          },
        },
        extendDefaults: true, // Keep other default banned types
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};
