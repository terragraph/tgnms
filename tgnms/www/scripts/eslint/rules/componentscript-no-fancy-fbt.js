/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// ComponentScript's fbt doesn't support certain features yet such as fbt.plural
// or variations in fbt.param
module.exports = context => {
  return {
    CallExpression(node) {
      const callee = node.callee;

      if (callee.type !== 'MemberExpression') {
        return;
      }

      if (callee.computed) {
        return;
      }

      if (callee.object.name !== 'fbt') {
        return;
      }

      checkPlural(node, context);
      checkParamVariationsArg(node, context);
    },
  };
};

function checkPlural(node, context) {
  const callee = node.callee;

  if (callee.property.name !== 'plural') {
    return;
  }

  context.report(
    node,
    'ComponentScript currently disallows the usage of certain fbt ' +
      'constructs such as fbt.plural().  As a workaround, you can ' +
      'rewrite your fbt call as two separate fbt calls, where one ' +
      'is the singular version, and one is the plural version.',
  );
}

function checkParamVariationsArg(node, context) {
  const callee = node.callee;
  const args = node.arguments;

  if (callee.property.name !== 'param') {
    return;
  }

  if (args.length < 3) {
    return;
  }

  context.report(
    node,
    'ComponentScript currently disallows the usage of certain fbt ' +
      'constructs such as the third positional parameter to fbt.param() ' +
      'specifying variations.',
  );
}
