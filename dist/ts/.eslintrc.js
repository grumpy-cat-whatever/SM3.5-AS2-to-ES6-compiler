module.exports = {
    env: {
        'browser': true,
        'commonjs': true,
        'es6': true
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    globals: {
      _global: 'readonly',
      _root: 'readonly',
      int: 'readonly',
      trace: 'writable'
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2018
    },
    plugins: [
      '@typescript-eslint'
    ],
    rules: {
      // 'no-undef': 0, //TEMPORARY
      'no-mixed-spaces-and-tabs': 0,
      'no-extra-semi': 0,
      'no-constant-condition': 0,
      'no-unused-vars': 0,
      'no-redeclare': 0,
      'no-var': 0
    }
};
