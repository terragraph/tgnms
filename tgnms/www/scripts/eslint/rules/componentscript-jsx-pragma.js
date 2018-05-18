/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

const JSX_CSX_PRAGMA_REGEX = /^\s*\*?\s+@csx$/m;

/**
 * In ComponentScript, we disable react/react-in-jsx-scope and replace it with this rule.
 * It enforces that if you use JSX, you must use @csx in the header.
 */
module.exports = context => {
  let nodeWithoutPragma = null;

  return {
    Program(node) {
      if (
        !node.comments.some(comment => JSX_CSX_PRAGMA_REGEX.test(comment.value))
      ) {
        nodeWithoutPragma = node;
      }
    },
    JSXOpeningElement(node) {
      if (nodeWithoutPragma != null) {
        context.report({
          node: nodeWithoutPragma,
          message: 'ComponentScript files with JSX must have "@csx"',
        });
        // Don't report more than once.
        nodeWithoutPragma = null;
      }
    },
  };
};
