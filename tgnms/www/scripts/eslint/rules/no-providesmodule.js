/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const utils = require('./utils/utils');

module.exports = function rule(context) {
  const source = context.getSourceCode().text;
  if (!source.includes('@' + 'providesModule')) {
    return {};
  }

  function checkForAtProvidesModule(node) {
    const docblockTags = utils.getModuleDocblock(node);
    if (!docblockTags) {
      return;
    }

    if (
      'providesModule' in docblockTags &&
      !('generated' in docblockTags) &&
      !('partially-generated' in docblockTags)
    ) {
      context.report({
        node,
        message: `${'@'}providesModule is deprecated and should not be used anymore.`,
      });
    }
  }

  return {
    Program: checkForAtProvidesModule,
  };
};
