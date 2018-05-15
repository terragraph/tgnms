/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @noformat (Prettier scrubs the flow type comments and nodejs won't run Flow)
 */

'use strict';

// const utils = require('./utils/utils');

const messages = {
  UNSUPPORTED_USAGE: 'Use of `?.` is limited. Search the wiki on "optional chaining operator" for details. DO NOT SUPPRESS THIS ERROR.',
  USELESS_USAGE: 'There is no reason to use `?.` on a literal.',
};

/*:
type EslintContext = {
  id: string,
  options: Array,
  report: Function,
};
*/

/**
 * A lint rule to lock down usages of the conditional operator (`?.`) to simple
 * cases only.
 */
function rule(context/*: Context*/) {
  return {
    MemberExpression(node) {
      if (node.optional === true) {
        checkMemberExpressionObject(node.object, node);
      }
    },
    CallExpression(node) {
      if (node.optional) {
        // x?.()
        context.report({
          node,
          message: messages.UNSUPPORTED_USAGE,
        });
      }
      // x?.y()
      assertForBeingBadArg(node.callee);
    },
    UnaryExpression(node) {
      if (node.operator === 'delete') {
        // delete foo?.bar
        assertForBeingBadArg(node.argument);
      }
    },
    NewExpression(node) {
      // new foo?.bar
      // new foo?.bar()
      assertForBeingBadArg(node.callee);
    },
    AssignmentExpression(node) {
      // foo?.bar = x
      // foo?.bar += x
      // Actual operator is irrelevant
      assertForBeingBadArg(node.left);
    },
    UpdateExpression(node) {
      // a?.b++
      // a?.b--
      // ++a?.b
      // --a?.b
      assertForBeingBadArg(node.argument);
    },
  };

  function checkMemberExpressionObject(node, parentMemberNode) {
    if (node.type === 'Identifier') {
      // foo?.
      return;
    }
    if (node.type === 'MemberExpression') {
      if (node.object.optional) {
        // x?.foo?.y
        // this plugin will have checked the left hand ?. so dont repeat that
        return;
      }
      // check the left hand of the member recursively
      // `foo?.bar?.baz`, we're going to check `foo` and accept `bar`
      return checkMemberExpressionObject(node.object, node);
    }
    if (node.type === 'Literal' || node.type === 'TemplateLiteral') {
      context.report({
        node,
        message: messages.USELESS_USAGE,
        fix(fixer) {
          return fixer.replaceText(parentMemberNode, '.');
        },
      });
      return;
    }
  }

  function assertForBeingBadArg(node) {
    if (node.type === 'MemberExpression') {
      if (node.optional) {
        context.report({
          node,
          message: messages.UNSUPPORTED_USAGE,
        });
      } else {
        // recursively go to the left
        assertForBeingBadArg(node.object);
      }
    }
  }
}

rule.messages = messages;

module.exports = rule;
