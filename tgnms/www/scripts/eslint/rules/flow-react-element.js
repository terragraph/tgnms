/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

function isIdentifier(node, name) {
  return node && node.type === 'Identifier' && node.name === name;
}

module.exports = context => ({
  GenericTypeAnnotation(node) {
    if (
      isIdentifier(node.id, 'ReactElement') ||
      isIdentifier(node.id, 'React$Element')
    ) {
      context.report({
        node: node.id,
        message: 'Use `React.Element<T>` instead of `' + node.id.name + '<T>`',
        fix: fixer => fixer.replaceText(node.id, 'React.Element'),
      });
    }
  },
});
