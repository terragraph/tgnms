/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const ERROR_MESSAGE =
  'Flow type of React Props should be read-only, e.g. $ReadOnly<{foo: number, bar: string}>';

module.exports = context => ({
  TypeAlias(node) {
    const isPropType = node && node.id && node.id.name === 'Props';
    const isObjectTypeAnnotation =
      node && node.right && node.right.type === 'ObjectTypeAnnotation';
    const isReadOnly =
      node && node.right && node.right.id && node.right.id.name === '$ReadOnly';
    if (isPropType && isObjectTypeAnnotation && !isReadOnly) {
      context.report({
        node,
        message: ERROR_MESSAGE,
      });
    }
  },
});
