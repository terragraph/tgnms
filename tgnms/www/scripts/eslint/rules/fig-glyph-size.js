/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

function handleFBIconExpression({context, expectedSize, message, exp}) {
  if (exp.arguments.length === 0) {
    return context.report(exp, message);
  } else if (exp.arguments.length === 1) {
    return context.report({
      node: exp,
      message,
      fix(fixer) {
        return fixer.replaceText(
          exp.arguments[0],
          `'${exp.arguments[0].value}', ${expectedSize}`,
        );
      },
    });
  } else if (exp.arguments[1].value !== expectedSize) {
    context.report({
      node: exp.arguments[1],
      message,
      fix(fixer) {
        return fixer.replaceText(exp.arguments[1], String(expectedSize));
      },
    });
  }
}

module.exports = context => {
  return {
    JSXOpeningElement(node) {
      // TODO (T23763338): Update this for FIGButton.
      try {
        if (
          node.name.name !== 'FIGGlyphTextButton' &&
          node.name.name !== 'FIGGlyphButton'
        ) {
          return;
        }
        let expectedSize = 16;
        let type;
        if (node.name.name === 'FIGGlyphTextButton') {
          let fancyProps = false;
          const typeNode = node.attributes.find(attr => {
            if (!attr.name) {
              fancyProps = true; // Can't deal with object spreads and other fanciness
              return false;
            }
            return attr.name.name === 'type';
          });
          if (!typeNode || !typeNode.value) {
            if (fancyProps) {
              return;
            }
            context.report(
              node,
              'type is a required prop of FIGGlyphTextButton.',
            );
            return;
          }
          type = typeNode.value.value || typeNode.value.expression.value;
          expectedSize = type && (type.includes('small') ? 12 : 16);
        }

        node.attributes.forEach(attr => {
          if (
            !attr.name || // Can't deal with object spreads and other craziness
            attr.name.name !== 'glyph' ||
            attr.value.type !== 'JSXExpressionContainer'
          ) {
            return;
          }
          const exp = attr.value.expression;
          if (exp.type !== 'CallExpression') {
            return; // Ideally we could handle this case, which is typically a ternary
          }
          const message =
            `glyph attribute of ${
              node.name.name
            } must include size that matches spec` +
            (expectedSize
              ? ` (${type ? type + ' -> ' : ''}${expectedSize})`
              : '') +
            '.';
          if (exp.callee.name === 'fbicon') {
            handleFBIconExpression({context, expectedSize, message, exp});
          }
        });
      } catch (error) {
        context.report(node, error.message + error.stack);
        // throw error;
      }
    },
  };
};
