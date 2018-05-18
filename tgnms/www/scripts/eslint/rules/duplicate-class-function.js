/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const ERROR_MESSAGE = 'Your class has a duplicate function declaration.';

module.exports = context => ({
  ClassDeclaration(node) {
    const superClass = node.superClass;
    if (!superClass) {
      return;
    }

    const classBody = node.body;
    if (!classBody) {
      return;
    }

    const bodyList = classBody.body;
    if (!bodyList) {
      return;
    }

    const seenFunctions = new Set();

    for (let i = 0; i < bodyList.length; i++) {
      const element = bodyList[i];
      let functionName;
      if (element.type === 'MethodDefinition') {
        functionName = element.key.name;
      } else if (element.type === 'ClassProperty') {
        const classProperty = element;
        if (
          classProperty.value &&
          classProperty.value.type === 'ArrowFunctionExpression' &&
          classProperty.key &&
          classProperty.key.name
        ) {
          functionName = classProperty.key.name;
        }
      }

      if (functionName) {
        if (seenFunctions.has(functionName)) {
          context.report({
            node: element,
            message: ERROR_MESSAGE,
          });
        } else {
          seenFunctions.add(functionName);
        }
      }
    }
  },
});
