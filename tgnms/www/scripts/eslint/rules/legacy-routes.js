/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const RelayRouteSpecificStatics = ['prepareParams', 'queries'];

function isLegacyRouteSuperClass(SuperClass) {
  switch (SuperClass.type) {
    case 'Identifier':
      return (
        SuperClass.name === 'UnsafeRoute' || SuperClass.name === 'RelayRoute'
      );
    case 'MemberExpression':
      return (
        SuperClass.object.name === 'Relay' &&
        SuperClass.property.name === 'Route'
      );
  }
  return false;
}

module.exports = context => ({
  ClassDeclaration(node) {
    const SuperClass = node.superClass;
    const routeName = node.id.name;
    if (SuperClass && isLegacyRouteSuperClass(SuperClass)) {
      context.report({
        node: SuperClass,
        message:
          `'${routeName}' is using the legacy route definition class. ` +
          "Please migrate it to use the 'Route' for better Flow-typing " +
          'by running `js1 codeshift route-definition <filename>`. ' +
          'This is assuming the component for this route is already free ' +
          'of RelayClassic and/or already migrated to RelayModern. ' +
          'See https://fburl.com/incredibleroute for more details.',
      });
      return;
    }

    if (SuperClass && SuperClass.name === 'Route') {
      node.body.body.forEach((b, index) => {
        if (b.type !== 'ClassProperty' || !b.static) {
          return;
        }
        if (RelayRouteSpecificStatics.includes(b.key.name)) {
          context.report({
            node: b,
            message:
              `'${b.key.name}' static in '${routeName}' is specific to ` +
              'RelayClassic. Please migrate your component to RelayModern, ' +
              "then migrate this class to use the 'Route'. " +
              'See https://fburl.com/incredibleroute for more details.',
          });
        }
      });
    }
  },
});
