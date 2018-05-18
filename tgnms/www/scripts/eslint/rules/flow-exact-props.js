/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const ERROR_MESSAGE =
  'Flow type of React Props should be exact, e.g. {|foo: number, bar: string|}';

module.exports = context => ({
  ObjectTypeAnnotation(node) {
    const isPropType =
      node && node.parent && node.parent.id && node.parent.id.name === 'Props';
    if (!node.exact && isPropType) {
      context.report({
        node,
        message: ERROR_MESSAGE,
      });
    }
  },
});
