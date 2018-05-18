/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @fileoverview Discourage the use of Dimensions.get('window').width/height api
 * @author Suketu Vakharia
 * @format
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

// This rule is reported as Advice by Arcanist.
module.exports = function(context) {
  const errorMessage =
    "Using Dimensions.get('window') is discouraged unless you are " +
    'fetching an image via GraphQL. See https://fburl.com/135191877.';

  /**
   * Gets tokens around the given callExpression node.
   * Verifies that the call expression is not calling into the target Dimensions.get('window') api.
   * @param {ASTNode} node - CallExpression Node.
   * @returns {void}
   */
  function warnOnDimensionsGetWindow(node) {
    const callTokens = context.getTokens(node);
    const postCallTokens = context.getTokensAfter(node, 2);

    // To trigger this rule, the we need 6 call tokens to spell out
    // ['Dimensions', '.', 'get', '(',''window'', ')'] and 2 post-call
    // tokens to spell out ['.', 'height|width']
    if (callTokens.length < 6 || postCallTokens.length < 2) {
      return;
    }

    if (
      callTokens[0].value === 'Dimensions' &&
      callTokens[2].value === 'get' &&
      (callTokens[4].value === '"window"' ||
        callTokens[4].value === "'window'") &&
      (postCallTokens[1].value === 'height' ||
        postCallTokens[1].value === 'width')
    ) {
      context.report(node, errorMessage, {identifier: node.expression});
    }
  }

  return {
    CallExpression: warnOnDimensionsGetWindow,
  };
};
