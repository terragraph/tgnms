/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

function isStyleSheetDeclaration(node) {
  return (
    node &&
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'StyleSheet' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'create' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'ObjectExpression'
  );
}

function getPropertiesByName(node) {
  const properties = new Map();
  node.properties
    .filter(property => !property.computed && !property.method)
    .forEach(property => {
      property.key && properties.set(property.key.name, property);
    });
  return properties;
}

module.exports = context => {
  const styleSheetProperties = new Map();
  const memberExpressions = new Map();
  const computedMemberExpressions = new Map();

  return {
    AssignmentExpression(node) {
      if (
        node.left.type === 'Identifier' &&
        isStyleSheetDeclaration(node.right)
      ) {
        styleSheetProperties.set(
          node.left.name,
          getPropertiesByName(node.right.arguments[0]),
        );
      }
    },

    VariableDeclarator(node) {
      if (node.id.type === 'Identifier' && isStyleSheetDeclaration(node.init)) {
        styleSheetProperties.set(
          node.id.name,
          getPropertiesByName(node.init.arguments[0]),
        );
      }
    },

    MemberExpression(node) {
      if (node.object.type !== 'Identifier') {
        return;
      }
      const objectName = node.object.name;
      if (node.computed) {
        if (!computedMemberExpressions.has(objectName)) {
          computedMemberExpressions.set(objectName, new Set());
        }
        computedMemberExpressions.get(objectName).add(node);
      } else {
        if (!memberExpressions.has(objectName)) {
          memberExpressions.set(objectName, new Set());
        }
        memberExpressions.get(objectName).add(node.property.name);
      }
    },

    'Program:exit'() {
      styleSheetProperties.forEach((properties, name) => {
        if (computedMemberExpressions.has(name)) {
          computedMemberExpressions.get(name).forEach(node => {
            context.report(
              node,
              `${name}[...] prevents lint from detecting unused styles.`,
            );
          });
        } else if (memberExpressions.has(name)) {
          properties.forEach((property, propertyName) => {
            if (memberExpressions.get(name).has(propertyName)) {
              return;
            }
            context.report(
              properties.get(propertyName),
              `Unused style detected: ${name}.${propertyName}`,
            );
          });
        }
      });
    },
  };
};
