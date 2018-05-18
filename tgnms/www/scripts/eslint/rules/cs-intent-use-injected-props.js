/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 */

'use strict';

const INJECTED_PROP_TYPES = new Set(['CSNavigator', 'CSNavigationCoordinator']);

/**
 * Ensures that CSNavigator and CSNavigationCoordinator are not passed as props
 * to a CSIntent, and that the navigator/navigationCoordinator that are injected
 * as parameters to the render function are used instead.
 */
module.exports = function csIntentUseInjectedProps(context) {
  const typeMap = new Map();

  function findPropsThatShouldBeInjected(objectTypeAnnotation) {
    if (
      objectTypeAnnotation == null ||
      objectTypeAnnotation.type !== 'ObjectTypeAnnotation'
    ) {
      return [];
    }
    return objectTypeAnnotation.properties.filter(
      x =>
        x.value.type === 'GenericTypeAnnotation' &&
        INJECTED_PROP_TYPES.has(x.value.id.name),
    );
  }

  function getObjectTypeAnnotation(typeParameter) {
    if (typeParameter.type === 'ObjectTypeAnnotation') {
      // Catches the case where the props type is defined inline:
      //
      // export const SomeIntent: IntentFactory<{| ... |}> = CSIntent({ ... });
      return typeParameter;
    } else if (typeParameter.type === 'GenericTypeAnnotation') {
      // Catches the case where the props type is defined separately:
      //
      // type Props = {| ... |};
      //
      // export const SomeIntent: IntentFactory<Props> = CSIntent({ ... });
      return typeMap.get(typeParameter.id.name);
    }
    return null;
  }

  return {
    TypeAlias: function(node) {
      // Build a mapping of type aliases so we can find a referenced generic props
      // type later. This only works if the props type is defined in the same file.
      // If it's defined elsewhere, there's nothing we can do.
      if (
        node.type === 'TypeAlias' &&
        node.right.type === 'ObjectTypeAnnotation'
      ) {
        typeMap.set(node.id.name, node.right);
      }
    },
    ExportNamedDeclaration: function(node) {
      if (
        node.declaration.type === 'VariableDeclaration' &&
        node.declaration.declarations.length === 1
      ) {
        const decl = node.declaration.declarations[0];
        if (
          decl.type === 'VariableDeclarator' &&
          decl.id.typeAnnotation != null &&
          decl.init.type === 'CallExpression' &&
          decl.init.callee.name === 'CSIntent'
        ) {
          const typeAnnotation = decl.id.typeAnnotation.typeAnnotation;
          if (
            typeAnnotation != null &&
            typeAnnotation.type === 'GenericTypeAnnotation' &&
            typeAnnotation.id.name === 'IntentFactory' &&
            typeAnnotation.typeParameters != null &&
            typeAnnotation.typeParameters.params.length === 1
          ) {
            const objectTypeAnnotation = getObjectTypeAnnotation(
              typeAnnotation.typeParameters.params[0],
            );
            const props = findPropsThatShouldBeInjected(objectTypeAnnotation);
            props.forEach(p =>
              context.report({
                node: p,
                message: `A prop of type ${
                  p.value.id.name
                } should not be passed into an intent. This prop is injected into the render() function, and the injected instance should be passed to the component instead.`,
              }),
            );
          }
        }
      }
    },
  };
};
