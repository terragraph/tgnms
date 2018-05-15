/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

module.exports = context => {
  const filename = context.getFilename();
  const inTest =
    filename.includes('/__tests__/') ||
    filename.includes('/__server_snapshot_tests__/');

  if (inTest) {
    return {};
  }

  return {
    JSXOpeningElement(node) {
      node.attributes.forEach(attribute => {
        if (attribute.type === 'JSXAttribute') {
          if (attribute.name.name.startsWith('testOnly_')) {
            context.report(
              attribute,
              'This prop is only allowed to be used in tests',
            );
          }
        }
      });
    },
  };
};
