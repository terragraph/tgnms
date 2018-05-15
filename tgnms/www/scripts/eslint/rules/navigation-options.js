/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const ERROR_MESSAGE = `
navigationOptions must be a bare object literal.
As in only strings, numbers and booleans can be used as values.
...ObjectSpread, functionCalls(), and Module.VALUES cannot be used.
fbt(), fbt.c() and fbicon are allowed though.
Please post in React Native Support or contact @mehdi if this is incorrect.`;

const PLATFORM_KEYS_MESSAGE =
  'Platform.select({ ... }) can only be used with ios or android keys.';

const NON_STATIC_VALUE_ERROR_MESSAGE =
  'navigationOptions must be set as a static value on the registered component for route.';

const ALLOWED_METHOD_CALLS = ['fbt', 'processColor'];

const PROCESS_COLOR_LITERAL = `
Unfortunately, only string literals can be used with processColor() in
navigationOptions. See D6667201 for more details.`;

module.exports = {
  meta: {
    docs: {
      description: '',
      recommended: false,
    },
    schema: [],
  },
  create: context => ({
    ClassProperty(node) {
      if (!node.key || node.key.name !== 'navigationOptions') {
        return;
      }

      function inspectOptions(value) {
        if (value.type === 'Literal') {
          return;
        }

        if (value.type === 'ObjectExpression') {
          for (const property of value.properties) {
            if (property.type !== 'Property') {
              context.report({
                node: property,
                message: ERROR_MESSAGE,
              });
            } else if (
              (property.key.type !== 'Identifier' &&
                property.key.type !== 'Literal') ||
              property.computed
            ) {
              context.report({
                node: property.key,
                message: ERROR_MESSAGE,
              });
            } else {
              inspectOptions(property.value);
            }
          }
        } else if (value.type === 'JSXElement') {
          // <fbt ... />
          if (value.openingElement.name.name !== 'fbt') {
            context.report({
              node: value,
              message: ERROR_MESSAGE,
            });
          }
        } else if (value.type === 'CallExpression') {
          if (value.callee.type === 'MemberExpression') {
            if (
              value.callee.object.type === 'Identifier' &&
              value.callee.object.name === 'fbicon' &&
              value.callee.property.type === 'Identifier' &&
              (value.callee.property.name === 'outline' ||
                value.callee.property.name === 'filled')
            ) {
              // We good, it's an fbicon.
              return;
            } else if (
              value.callee.object.type === 'Identifier' &&
              value.callee.object.name === 'Platform' &&
              value.callee.property.type === 'Identifier' &&
              value.callee.property.name === 'select' &&
              value.arguments.length === 1 &&
              value.arguments[0].type === 'ObjectExpression'
            ) {
              if (
                !value.arguments[0].properties.every(
                  x =>
                    x.key.type === 'Identifier' &&
                    (x.key.name === 'ios' || x.key.name === 'android'),
                )
              ) {
                context.report({
                  node: value.arguments[0],
                  message: PLATFORM_KEYS_MESSAGE,
                });
              } else {
                inspectOptions(value.arguments[0]);
              }
            } else if (
              value.callee.object.type === 'Identifier' &&
              value.callee.object.name === 'fbt' &&
              value.callee.property.type === 'Identifier' &&
              value.callee.property.name === 'c'
            ) {
              // fbt.c (fbt common) is allowed
              return;
            } else {
              context.report({
                node: value,
                message: ERROR_MESSAGE,
              });
            }
          } else if (
            value.callee.type !== 'Identifier' ||
            ALLOWED_METHOD_CALLS.indexOf(value.callee.name) === -1
          ) {
            context.report({
              node: value,
              message: ERROR_MESSAGE,
            });
          } else if (
            value.callee.type === 'Identifier' &&
            value.callee.name === 'processColor' &&
            value.arguments.length === 1 &&
            value.arguments[0].type !== 'Literal'
          ) {
            context.report({
              node: value.arguments[0],
              message: PROCESS_COLOR_LITERAL,
            });
          }
        } else if (value.type === 'MemberExpression') {
          if (
            value.object.type !== 'Identifier' ||
            !value.object.name.startsWith('QuickLogIdentifiers') ||
            value.property.type !== 'Identifier'
          ) {
            context.report({
              node: value,
              message: ERROR_MESSAGE,
            });
          }
        } else {
          context.report({
            node: value,
            message: ERROR_MESSAGE,
          });
        }
      }

      inspectOptions(node.value);
    },
    AssignmentExpression(node) {
      if (
        node.left.type !== 'MemberExpression' ||
        node.left.property.name !== 'navigationOptions'
      ) {
        return;
      }

      context.report({
        node,
        message: NON_STATIC_VALUE_ERROR_MESSAGE,
      });
    },
  }),
};
