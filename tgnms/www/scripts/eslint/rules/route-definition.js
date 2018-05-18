/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const FlowTypeToRouteParamType = {
  BooleanTypeAnnotation: 'Bool',
  NumberTypeAnnotation: 'Int',
  StringTypeAnnotation: 'String',
  Fbt: 'String',
};
const ForbiddenStatics = ['routeName', 'paramDefinitions'];

function normalizeParamTypeProp(paramTypeProp) {
  // Allow nullable type as well.
  const isNullable = paramTypeProp.value.type === 'NullableTypeAnnotation';
  const value = isNullable
    ? paramTypeProp.value.typeAnnotation
    : paramTypeProp.value;
  const valueType =
    value.type === 'GenericTypeAnnotation' ? value.id.name : value.type;
  return valueType;
}

module.exports = context => ({
  ClassDeclaration(node) {
    const SuperClass = node.superClass;
    const superTypeParams = node.superTypeParameters;
    if (SuperClass && SuperClass.name === 'Route') {
      const routeName = node.id.name;
      if (!superTypeParams || superTypeParams.params.length !== 1) {
        context.report({
          node: SuperClass,
          message:
            `Subclass \`${routeName}\` of \`${SuperClass.name}\` must ` +
            'provide exactly one type parameter that declares the expected ' +
            'parameters.',
        });
        return;
      }

      const paramType = superTypeParams.params[0];
      if (
        paramType.type !== 'ObjectTypeAnnotation' &&
        paramType.type !== 'VoidTypeAnnotation'
      ) {
        context.report({
          node: superTypeParams,
          message:
            'Route params Flow type must be specified as inline object type ' +
            'or void.',
        });
        return;
      } else if (
        paramType.type === 'ObjectTypeAnnotation' &&
        paramType.exact !== true
      ) {
        context.report({
          node: superTypeParams,
          message:
            'Route params Flow type must be specified as an exact object type.',
        });
        return;
      }

      // Find existing statics that shouldn't be specified manually.
      let hasForbiddenStatics = false;
      node.body.body.forEach((b, index) => {
        if (b.type !== 'ClassProperty' || !b.static) {
          return;
        }
        if (ForbiddenStatics.includes(b.key.name)) {
          const start = b.start;
          const end =
            index < node.body.body.length - 1
              ? node.body.body[index + 1].start
              : b.end;
          context.report({
            node: b,
            message: `'${routeName}' cannot manually specify \`${
              b.key.name
            }\`.`,
            fix: fixer => fixer.removeRange([start, end]),
          });
          hasForbiddenStatics = true;
        }
      });
      if (hasForbiddenStatics) {
        return;
      }

      if (paramType.type === 'ObjectTypeAnnotation') {
        if (!paramType.properties.length) {
          context.report({
            node: superTypeParams,
            message:
              `Inline object param type for '${routeName}' must have at ` +
              'least one property. Use `void` if there is no expected param.',
            fix: fixer => fixer.replaceText(paramType, 'void'),
          });
          return;
        }
        paramType.properties.forEach(prop => {
          const valueType = normalizeParamTypeProp(prop);
          if (!FlowTypeToRouteParamType.hasOwnProperty(valueType)) {
            context.report({
              node: prop,
              message:
                'Route param type can only be `string`, `number`, or `boolean`',
            });
          }
        });
      }
    }
  },
});
