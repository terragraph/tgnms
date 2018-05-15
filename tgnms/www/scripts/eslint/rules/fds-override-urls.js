/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const ERROR_MESSAGE =
  'fdsOverride props must include a link to a workplace post in the docblock. Expected to find a URL like https://fb.facebook.com/groups/FDSFeedback/permalink/1888546694527270';

// This worksaround an issue in babel-eslint.
// https://github.com/babel/babel-eslint/issues/307#issuecomment-359474208
function getTypeKey(context, node) {
  if (node.type !== 'ObjectTypeProperty') {
    throw new Error('Can only be called on ObjectTypeProperty');
  }

  let tokenIndex = 0;

  if (node.static) {
    tokenIndex++;
  }

  if (node.variance) {
    tokenIndex++;
  }

  return context.getSourceCode().getFirstToken(node, tokenIndex);
}

module.exports = context => {
  return {
    ObjectTypeProperty(node) {
      const typeKey = getTypeKey(context, node);
      if (!typeKey.value.startsWith('fdsOverride_')) {
        return;
      }

      const leadingComments = node.leadingComments;
      if (leadingComments == null) {
        context.report(node, ERROR_MESSAGE);
        return;
      }

      const hasWorkplaceUrl = leadingComments.some(comment => {
        return (
          comment.value.match(
            /https:\/\/fb.facebook.com\/groups\/(.*)+\/permalink\/\d+/,
          ) != null
        );
      });

      if (!hasWorkplaceUrl) {
        context.report(node, ERROR_MESSAGE);
      }
    },
  };
};
