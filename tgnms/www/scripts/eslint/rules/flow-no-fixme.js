/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';
// TODO T24705430 open source the rule

const message =
  '$FlowFixMe is as bad as Object/Function, fix it or add a TODO txxxx to follow up';

function isIdentifier(node, name) {
  return node && node.type === 'Identifier' && node.name.match(name);
}

module.exports = function(context) {
  function handleComment(comment) {
    var value = comment.value.trim();
    if (value.match(/\$FlowFixMe/) && !value.match(/TODO\s+[Tt][0-9]+/)) {
      context.report(comment, message);
    }
  }

  return {
    Program() {
      for (const comment of context.getSourceCode().getAllComments()) {
        handleComment(comment);
      }
    },
    GenericTypeAnnotation(node) {
      if (isIdentifier(node.id, /\$FlowFixMe/)) {
        context.report({
          node: node.id,
          message,
        });
      }
    },
  };
};
