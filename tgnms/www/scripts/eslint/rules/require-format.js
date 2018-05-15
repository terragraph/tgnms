/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

var utils = require('./utils/utils');

module.exports = function rule(context) {
  const skipFilenamePattern =
    context.options && context.options.length ? context.options[0] : null;

  return {
    Program: function(node) {
      if (context.getFilename().match(skipFilenamePattern)) {
        return;
      }

      const docblock = utils.getModuleDocblock(node);
      if (
        docblock &&
        ('noformat' in docblock ||
          'generated' in docblock ||
          'partially-generated' in docblock)
      ) {
        return;
      }

      if (!docblock || !('format' in docblock)) {
        context.report({
          loc: {line: 1, column: 0},
          message:
            'All files should be enabled for Prettier by adding @format to ' +
            'the file comment.',
          fix(fixer) {
            const src = context.getSourceCode().text;
            if (docblock && src.indexOf(' */') !== -1) {
              return fixer.insertTextBeforeRange(
                [src.indexOf(' */')],
                ' * @format\n',
              );
            }
            return undefined;
          },
        });
      }
    },
  };
};
