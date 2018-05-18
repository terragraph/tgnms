/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const ASSIGNMENT_MESSAGE =
  'Array<RouteRegistration> should be used on the module.exports';

const ARRAY_LITERAL_MESSAGE =
  'Only array literals can be used to satisfy Array<RouteRegistration>.';

const ARRAY_VALUE_MESSAGE =
  'Only object literals and object spread can be used to satisfy Array<RouteRegistration>.';

module.exports = {
  meta: {
    docs: {
      description: '',
      recommended: false,
    },
    schema: [],
  },
  create: context => ({
    TypeAnnotation(node) {
      if (
        node.typeAnnotation.type !== 'GenericTypeAnnotation' ||
        node.typeAnnotation.id.name !== 'Array' ||
        node.typeAnnotation.typeParameters == null ||
        node.typeAnnotation.typeParameters.params == null ||
        node.typeAnnotation.typeParameters.params[0].type !==
          'GenericTypeAnnotation' ||
        node.typeAnnotation.typeParameters.params[0].id.name !==
          'RouteRegistration'
      ) {
        return;
      }

      const ancestors = context.getAncestors().reverse();
      if (ancestors[0].type !== 'TypeCastExpression') {
        return;
      }

      if (ancestors[0].expression.type !== 'ArrayExpression') {
        context.report({
          node: ancestors[0].expression,
          message: ARRAY_LITERAL_MESSAGE,
        });
      } else {
        // Scan the array to make sure it's all object spreads or literals.
        ancestors[0].expression.elements.forEach(element => {
          if (
            element.type !== 'SpreadElement' &&
            element.type !== 'ObjectExpression'
          ) {
            context.report({
              node: element,
              message: ARRAY_VALUE_MESSAGE,
            });
          }
        });
      }

      if (ancestors[1].type !== 'AssignmentExpression') {
        context.report({
          node: ancestors[1],
          message: ASSIGNMENT_MESSAGE,
        });
      } else if (
        ancestors[1].left.type !== 'MemberExpression' ||
        ancestors[1].left.object.name !== 'module' ||
        ancestors[1].left.property.name !== 'exports'
      ) {
        context.report({
          node: ancestors[1].left,
          message: ASSIGNMENT_MESSAGE,
        });
      }
    },
  }),
};
