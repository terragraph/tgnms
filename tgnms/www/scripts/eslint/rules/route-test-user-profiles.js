/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

module.exports = context => ({
  ClassDeclaration(node) {
    if (node.superClass && node.superClass.name === 'Route') {
      node.body.body.forEach((b, index) => {
        if (b.key.name === 'testDataConfigs') {
          if (!b.value.properties) {
            return;
          }
          b.value.properties.forEach(config => {
            if (!config.value.properties) {
              return;
            }
            config.value.properties.forEach(prop => {
              if (
                prop.computed === false &&
                prop.key.name === 'testUser' &&
                prop.value.type === 'Literal' &&
                typeof prop.value.value === 'string' &&
                prop.value.value.match(/^[0-9]+$/)
              ) {
                return context.report({
                  node: prop,
                  message:
                    'Please set testUser: <ProfileName> (https://fburl.com/rn-test-user-profiles)',
                });
              }
            });
          });
        }
      });
    }
  },
});
