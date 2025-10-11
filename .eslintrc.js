// eslint.config.js
module.exports = {
  env: {
    es6: true,
    jest: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
  },
  plugins: ['jest', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
  ],
  rules: {
    indent: 'off',
    'lines-between-class-members': [
      'error',
      'always',
      {
        exceptAfterSingleLine: true,
      },
    ],
    'no-case-declarations': 0,
    'no-console': 0,
    'no-dupe-class-members': 'off',
    'no-unused-vars': 0,
    'padding-line-between-statements': [
      'error',
      {
        blankLine: 'always',
        prev: 'multiline-expression',
        next: 'multiline-expression',
      },
    ],
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': 'allow-with-description',
      },
    ],
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: null,
      },
      {
        selector: 'interface',
        prefix: [],
        format: null,
      },
    ],
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'none',
      },
    ],
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': ['off'],
        '@typescript-eslint/no-var-requires': ['off'],
      },
    },
  ],
};
