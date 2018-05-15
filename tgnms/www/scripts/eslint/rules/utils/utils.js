/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

function isGeneratedFile(context) {
  return (
    context
      .getSourceCode()
      .getText()
      .indexOf('@' + 'generated SignedSource<<') !== -1
  );
}

/**
 * Returns the module docblock tags as a map
 * Returns null otherwise.
 */
function getModuleDocblock({comments}) {
  if (!comments) {
    return null;
  }

  let docblock;
  if (comments.length >= 1 && comments[0].type === 'Block') {
    docblock = comments[0];
  } else if (
    comments.length >= 2 &&
    comments[0].type === 'Shebang' &&
    comments[1].type === 'Block'
  ) {
    docblock = comments[1];
  } else {
    return null;
  }

  const docblockValue = docblock.value || '';

  const propertyRegex = /@(\S+) *(\S*)/g;
  let captures;
  const docblockMap = Object.create(null);

  while ((captures = propertyRegex.exec(docblockValue))) {
    const property = captures[1];
    const value = captures[2];
    docblockMap[property] = value;
  }

  return docblockMap;
}

module.exports = {
  getModuleDocblock,
  isGeneratedFile,
};
