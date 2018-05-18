/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

// A list of modules that are known to cause trouble to apps when they get required.
const EXPENSIVE_MODULES = new Set(['lodash']);

// This rule is reported as Advice by Arcanist.
const reportError = (context, node) =>
  context.report(
    node,
    `Requiring "${node.value}" is known to be expensive. ` +
      'It can slow down startup of your app by introducing a lot of code that ' +
      'is often unnecessary. It is recommended to directly require a smaller part ' +
      'of this module or to refactor the module into smaller pieces.',
  );

module.exports = context => ({
  CallExpression(node) {
    if (
      node.callee &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'require' &&
      node.arguments.length >= 1 &&
      node.arguments[0].type === 'Literal' &&
      EXPENSIVE_MODULES.has(node.arguments[0].value)
    ) {
      reportError(context, node.arguments[0]);
    }
  },
  ExportNamedDeclaration(node) {
    if (
      node.source &&
      node.source.type === 'Literal' &&
      node.exportKind === 'value' &&
      EXPENSIVE_MODULES.has(node.source.value)
    ) {
      reportError(context, node.source);
    }
  },

  ImportDeclaration(node) {
    if (
      node.source &&
      node.source.type === 'Literal' &&
      node.importKind === 'value' &&
      EXPENSIVE_MODULES.has(node.source.value)
    ) {
      reportError(context, node.source);
    }
  },
});
