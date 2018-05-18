/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Forked from https://fburl.com/jsx-no-undef to add namespace support
 *
 * @format
 */

/**
 * @fileoverview Disallow undeclared variables in JSX
 * @author Yannick Croissant
 */

'use strict';

/**
 * Checks if a node name match the JSX tag convention.
 * @param {String} name - Name of the node to check.
 * @returns {boolean} Whether or not the node name match the JSX tag convention.
 */
var tagConvention = /^[a-z]|\-/;
function isTagName(name) {
  return tagConvention.test(name);
}

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = function(context) {
  /**
   * Compare an identifier with the variables declared in the scope
   * @param {ASTNode} node - Identifier or JSXIdentifier node
   * @returns {void}
   */
  function checkIdentifierInJSX(node) {
    var scope = context.getScope();
    var variables = scope.variables;
    var i;
    var len;

    if (node.type === 'JSXNamespacedName') {
      if (node.namespace.name.trim() === 'fbt') {
        // Ignore fbt namespaced names (the only one allowed).
        return;
      } else {
        context.report(
          node,
          'Only `fbt` namespace tags are supported: <' +
            node.namespace.name +
            ':' +
            node.name.name +
            '>',
        );
        return;
      }
    }

    while (scope.type !== 'global') {
      scope = scope.upper;
      variables = scope.variables.concat(variables);
    }
    if (scope.childScopes.length) {
      variables = scope.childScopes[0].variables.concat(variables);
      // Temporary fix for babel-eslint
      if (scope.childScopes[0].childScopes.length) {
        variables = scope.childScopes[0].childScopes[0].variables.concat(
          variables,
        );
      }
    }

    for (i = 0, len = variables.length; i < len; i++) {
      if (variables[i].name === node.name) {
        return;
      }
    }

    context.report(node, "'" + node.name + "' is not defined.");
  }

  return {
    JSXOpeningElement: function(node) {
      if (isTagName(node.name.name)) {
        return;
      }
      checkIdentifierInJSX(node.name);
    },
  };
};
