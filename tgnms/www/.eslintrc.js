/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @noformat
 */
'use strict';

const path = require('path');

const rootDir = path.join(__dirname, '..');

// https://our.intern.facebook.com/intern/dex/eslint/
// https://eslint.org/docs/user-guide/configuring#configuring-rules

module.exports.extends = 'eslint-config-fb-strict';

module.exports.plugins = ['flowtype', 'lint', 'prettier', 'react', 'relay'];

module.exports.env = {
  browser: true,
  es6: true,
  jasmine: true,
};

module.exports.globals = {
  __BUNDLE_START_TIME__: false,
  __filename: false,
  Buffer: false,
  Promise: false,
  FormData: true,
  Class: false,
  ArrayBufferView: false,
  Iterable: false,
  Iterator: false,
  IteratorResult: false,
};

// https://eslint.org/docs/rules/

module.exports.rules = {
  'comma-dangle': ['warn', 'always-multiline'],
  'no-alert': 'off',
  'no-console': ['warn', {allow: ['error', 'warn']}],
  'prefer-const': ['warn', {destructuring: 'all'}],
  'sort-keys': 'warn',
  'max-len': 'warn',
  strict: 'off',

  'lint/componentscript-jsx-pragma': 'off',
  'lint/componentscript-no-fancy-fbt': 'off',
  'lint/cs-intent-use-injected-props': 'off',
  'lint/duplicate-class-function': 'off',
  'lint/flow-exact-props': 'off',
  'lint/flow-exact-state': 'off',
  'lint/flow-readonly-props': 'off',
  'lint/test-only-props': 'off',
  'lint/only-plain-ascii': 'off',
  'lint/react-avoid-set-state-with-potentially-stale-state': 'off',
  'lint/sort-keys-fixable': 'off',

  // Flow Plugin
  // The following rules are made available via `eslint-plugin-flowtype`
  'flowtype/define-flow-type': 1,
  'flowtype/use-flow-type': 1,

  // Prettier Plugin
  // https://github.com/prettier/eslint-plugin-prettier
  'prettier/prettier': [2, 'fb', '@format'],

  // React Plugin
  // https://github.com/yannickcr/eslint-plugin-react
  'react/display-name': 0,
  'react/jsx-boolean-value': 0,
  'react/jsx-no-comment-textnodes': 1,
  'react/jsx-no-duplicate-props': 2,
  'react/jsx-no-undef': 2,
  'react/jsx-sort-props': 0,
  'react/jsx-uses-react': 1,
  'react/jsx-uses-vars': 1,
  'react/no-did-mount-set-state': 1,
  'react/no-did-update-set-state': 1,
  'react/no-is-mounted': 'warn',
  'react/no-multi-comp': 0,
  'react/no-string-refs': 1,
  'react/no-unknown-property': 0,
  'react/prop-types': 0,
  'react/react-in-jsx-scope': 1,
  'react/self-closing-comp': 1,
  'react/wrap-multilines': 0,

  // Jest Plugin
  // The following rules are made available via `eslint-plugin-jest`.
  // "jest/no-disabled-tests": 1,
  // "jest/no-focused-tests": 1,
  // "jest/no-identical-title": 1,
  // "jest/valid-expect": 1,
};

module.exports.parser = 'babel-eslint';

module.exports.parserOptions = {
  'ecmaVersion': 6,
  'ecmaFeatures': {
    'jsx': true,
  },
  'sourceType': 'module',
};

module.exports.overrides = [
  {
    files: ['.eslintrc.js'],
    rules: {
      quotes: ['warn', 'single'],
    },
  },
  {
    files: [
      'aggregatorProxy.js',
      'dataJson.js',
      'paths.js',
      'queryHelper.js',
      'scripts/**/*.js',
      'static/apidoc/**/*.js',
      'server.js',
      'webpack.*.js',
      'worker.js',
    ],
    rules: {
      'no-console': 'off',
    },
    env: {
      node: true,
    },
  },
];
