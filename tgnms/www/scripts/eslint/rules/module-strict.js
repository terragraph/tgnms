/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

function getUseStrictDirectives(statements) {
  const directives = [];
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    if (
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'Literal' &&
      statement.expression.value === 'use strict'
    ) {
      directives[i] = statement;
    } else {
      break;
    }
  }
  return directives;
}

function isCommentDisablingStrictRule(comment) {
  return !!(
    comment.value.match(/^\s*eslint-disable\s+/) &&
    comment.value.match(/\bstrict\b/)
  );
}

module.exports = context => ({
  Program(node) {
    // HACK: Detect if the `strict` rule is disabled and ignore this rule.
    if (
      context
        .getSourceCode()
        .getAllComments()
        .some(isCommentDisablingStrictRule)
    ) {
      return;
    }

    const useStrictDirectives = getUseStrictDirectives(node.body);

    if (node.body.length > 0 && useStrictDirectives.length === 0) {
      context.report(node, "Missing `'use strict';`.");
    }
  },
});
