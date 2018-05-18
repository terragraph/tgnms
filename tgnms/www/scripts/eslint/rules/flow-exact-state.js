/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const ERROR_MESSAGE =
  'Flow type of React State should be exact, e.g. {|foo: number, bar: string|}';

module.exports = context => ({
  ObjectTypeAnnotation(node) {
    const isStateType =
      node && node.parent && node.parent.id && node.parent.id.name === 'State';
    if (!node.exact && isStateType) {
      context.report({
        node,
        message: ERROR_MESSAGE,
      });
    }
  },
});
