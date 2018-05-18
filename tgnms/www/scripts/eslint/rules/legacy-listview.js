/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const MESSAGE =
  'ListView is deprecated, buggy, and unmaintained - see https://fburl.com/better_lists for ' +
  'details. tl;dr use FIGList, FIGSectionList, RelayPaginationView (+FIGList, etc), FlatList, ' +
  'or SectionList instead. \ndeprecate-stamp';

module.exports = context => ({
  CallExpression(node) {
    if (node.callee.name === 'require') {
      if (node.arguments[0].value === 'ListView') {
        context.report(node, MESSAGE);
      }
    }
  },

  ImportDeclaration(node) {
    if (node.source.value === 'ListView') {
      context.report(node, MESSAGE);
    }
    if (node.source.value === 'react-native') {
      if (Array.isArray(node.specifiers)) {
        node.specifiers.forEach(spec => {
          if (spec.imported && spec.imported.name === 'ListView') {
            context.report(spec, MESSAGE);
          }
        });
      }
    }
  },

  VariableDeclarator(node) {
    if (node.init) {
      const RNRequire =
        node.init.type === 'CallExpression' &&
        node.init.callee.name === 'require' &&
        node.init.arguments[0].value === 'react-native';
      if (
        RNRequire ||
        ['ReactNative', 'react-native'].includes(node.init.name)
      ) {
        if (node.id.type === 'ObjectPattern') {
          node.id.properties.forEach(prop => {
            if (prop.value.name === 'ListView') {
              context.report(prop, MESSAGE);
            }
          });
        }
      }
    }
  },
});
