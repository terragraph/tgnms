/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

'use strict';

const utils = require('./utils/utils');

/**
 * Enforces `require`s are grouped into different segments, such as Classes (e.g. `React`) and
 * functions.
 *
 * Each group is sorted, then the groups are sorted and placed with newlines in between. Some groups
 * like Class are sorted by the assigned identifier, and others like imports are sorted by the
 * module name. Comments are preserved, but anything outside of the main require block can't be
 * autofixed and is ignored.
 *
 * Example:
 *
 * This require mess:
 *
 *   ```
 *     const Relay = require('Relay');
 *     const React = require('React');
 *
 *     const ScrollView = require('ScrollView'); // Some comment
 *
 *     const StyleSheet = require('StyleSheet');
 *     const {Foo} = require('BetaModules');
 *     import type {SomeType} from 'MyTypes';
 *     const {Zed} = require('AlphaModules');
 *
 *     const idx = require('idx');
 *     const abc = require('xyz');
 *     const cat = require('./cat');
 *
 *     type Fizz = {fizz: number}; // end of require blocks
 *     export type Buzz = {buzz: Fizz};
 *
 *     const fbt = require('fbt'); // Ignored
 *   ```
 *
 * will become:
 *
 *   ```
 *     const React = require('React');
 *     const Relay = require('Relay');
 *     const ScrollView = require('ScrollView'); // Some comment
 *     const StyleSheet = require('StyleSheet');
 *
 *     const abc = require('xyz');
 *     const cat = require('./cat');
 *     const idx = require('idx');
 *
 *     const {Zed} = require('AlphaModules');
 *     const {Foo} = require('BetaModules');
 *
 *     import type {SomeType} from 'MyTypes';
 *
 *     type Fizz = {fizz: number}; // end of require blocks
 *     export type Buzz = {buzz: Fizz};
 *
 *     const fbt = require('fbt'); // Ignored
 *   ```
 */

function sortBySortKey(arr) {
  return arr.sort(
    (a, b) => (a.sortKey === b.sortKey ? 0 : a.sortKey > b.sortKey ? 1 : -1),
  );
}

// Returns a comment that is on the same line as the node.
function getTrailingComment(node, source) {
  const comments = source.getComments(node);
  if (comments.trailing.length) {
    const comment = comments.trailing[0];
    if (source.getText().indexOf('\n', node.range[0]) >= comment.range[1]) {
      // No newline, this trailing comment is on the same line!
      return comment;
    }
  }
  return null;
}

function isRequireDeclaration(node, onNestedDeclaration) {
  if (node.type === 'ImportDeclaration' && node.source && node.source.value) {
    return true;
  }
  if (node.type === 'TypeAlias' && node.id && node.id.name) {
    return true;
  }
  if (
    node.type === 'ExportNamedDeclaration' &&
    node.source &&
    node.source.value
  ) {
    return true;
  }
  if (node.type === 'ExportAllDeclaration' && node.source.value) {
    return true;
  }
  if (
    !node.declarations ||
    !node.declarations[0] ||
    !node.declarations[0].init
  ) {
    return false;
  }
  const initExpression = node.declarations[0].init;
  if (
    initExpression.type === 'CallExpression' &&
    initExpression.callee.type === 'Identifier' &&
    initExpression.callee.name === 'require' &&
    initExpression.arguments.length === 1 &&
    initExpression.arguments[0].value
  ) {
    return true;
  }
}

function getTextForRequire(node, processedComments, source) {
  let reqStart = node.range[0];
  let reqEnd = node.range[1];
  const comments = source.getComments(node);
  if (comments.leading.length) {
    for (let ii = 0; ii < comments.leading.length; ii++) {
      const comment = comments.leading[ii];
      if (!processedComments[comment.start]) {
        reqStart = comment.range[0];
        processedComments[comment.start] = true;
        break;
      }
    }
  }
  const trailingComment = getTrailingComment(node, source);
  if (trailingComment) {
    processedComments[trailingComment.start] = true;
    reqEnd = trailingComment.range[1];
  }
  return source.getText().substring(reqStart, reqEnd);
}

function addToGroup(node, sortGroups, processedComments, source) {
  let group = sortGroups.UNKNOWN;
  let sortKey = null;
  if (node.type === 'ImportDeclaration') {
    const importGroupAndKey = getImportGroupAndKey(
      node,
      sortGroups,
      processedComments,
      source,
    );
    group = importGroupAndKey.group;
    sortKey = importGroupAndKey.sortKey;
  } else if (
    node.type === 'ExportNamedDeclaration' ||
    node.type === 'ExportAllDeclaration'
  ) {
    group = sortGroups.EXPORT;
    sortKey = getExportSortKey(node);
  } else {
    const decl = node.declarations[0];
    if (decl.id.name) {
      sortKey = decl.id.name;
      if (isFunctionKey(sortKey)) {
        group = sortGroups.FUNCTION;
      } else {
        group = sortGroups.CLASS;
      }
    } else {
      if (node.declarations[0].id.properties) {
        group = sortGroups.DESTRUCTURE;
        sortKey = node.declarations[0].init.arguments[0].value;
      }
    }
  }
  if (group === sortGroups.UNKNOWN) {
    console.warn('No group match for require: ', source.getText(node));
  }
  group.requires.push({
    node,
    sortKey: sortKey || '<unknown>',
    text: getTextForRequire(node, processedComments, source),
  });
}

function getImportGroupAndKey(node, sortGroups, processedComments, source) {
  const sortKey = getImportSortKey(node);
  const specifier = node.specifiers[0];

  if (!specifier) {
    return {
      group: sortGroups.EMPTY_IMPORT,
      sortKey,
    };
  }
  if (node.type === 'ImportDeclaration') {
    return {
      group: sortGroups.IMPORT,
      sortKey,
    };
  }

  console.warn(
    'No import or export group match for require: ',
    source.getText(node),
  );
  return {
    group: sortGroups.UNKNOWN_IMPORT,
    sortKey,
  };
}

// Sort within an import group first by module name.
// Then by whether it's a type, lastly by specifier type.
function getImportSortKey(node) {
  const source = node.source;
  const sourceName = source.value;
  const specifier = node.specifiers[0];
  if (!specifier) {
    // side-effect import: DO NOT SORT
    return '';
  }

  const typeValue = node.importKind === 'type' ? 20 : 10;
  if (specifier.type === 'ImportNamespaceSpecifier') {
    // import * as X from 'X'
    return `${sourceName}:${typeValue}:${specifier.local.name}`;
  }
  if (specifier.type === 'ImportDefaultSpecifier') {
    // import X from 'X';
    return `${sourceName}:${typeValue + 1}`;
  }
  if (specifier.type === 'ImportSpecifier') {
    // import {a, b} from 'X';
    return `${sourceName}:${typeValue + 2}:${specifier.imported.name}`;
  }

  console.warn('No specifier match for import: ', source.getText(node));
  return `${sourceName}:${typeValue + 9}`;
}

// Sort within an export group first by module name.
// Then by whether it's a type, lastly by specifier type.
function getExportSortKey(
  node /* ExportNamedDeclaration | ExportAllDeclaration */,
) {
  const source = node.source;
  const sourceName = source.value;
  if (node.type === 'ExportAllDeclaration') {
    // export * from 'X';
    return sourceName;
  }

  const specifier = node.specifiers && node.specifiers[0];
  const typeValue = node.exportKind === 'type' ? 20 : 10;

  if (specifier.type === 'ExportNamespaceSpecifier') {
    // export * as X from 'X';
    return `${sourceName}:${typeValue}`;
  }
  if (specifier.type === 'ExportDefaultSpecifier') {
    // export X from 'X';
    return `${sourceName}:${typeValue + 1}`;
  }
  if (specifier.type === 'ExportSpecifier') {
    // export {a, b} from 'X';
    return `${sourceName}:${typeValue + 2}:${specifier.exported.name}`;
  }

  console.warn('No specifier match for export: ', source.getText(node));
  return `${sourceName}:${typeValue + 9}`;
}

function isFunctionKey(sortKey) {
  return sortKey[0] === sortKey[0].toLowerCase();
}

module.exports = context => {
  if (utils.isGeneratedFile(context)) {
    return {};
  }
  const sortGroups = {
    EMPTY_IMPORT: {
      pri: '0',
      requires: [],
    },
    CLASS: {
      pri: '10',
      requires: [],
    },
    FUNCTION: {
      pri: '20',
      requires: [],
    },
    DESTRUCTURE: {
      pri: '30',
      requires: [],
    },
    IMPORT: {
      pri: '40',
      requires: [],
    },
    EXPORT: {
      pri: '50',
      requires: [],
    },
    UNKNOWN: {
      pri: '90',
      requires: [],
    },
  };
  const source = context.getSourceCode();
  const nestedDeclarations = {}; // e.g. type exports
  const processedComments = {};
  let requiresStarted = false;
  let endOfRequiresReached = false;
  const allRequireBlockNodes = [];
  function handleDeclaration(node) {
    if (nestedDeclarations[node.start] || endOfRequiresReached) {
      return;
    }
    if (
      !isRequireDeclaration(node, nestedDeclaration => {
        nestedDeclarations[nestedDeclaration.start] = true;
      })
    ) {
      if (requiresStarted) {
        endOfRequiresReached = true;
      }
      return;
    }
    // Don't include any leading comments on the first require. Note this is necessary for files
    // that don't have 'use strict';, otherwise we might move the Copyright header...
    if (allRequireBlockNodes.length === 0) {
      source.getComments(node).leading.forEach(comment => {
        processedComments[comment.start] = true;
      });
    }

    requiresStarted = true;
    addToGroup(node, sortGroups, processedComments, source);
    allRequireBlockNodes.push(node);
  }
  return {
    VariableDeclaration: handleDeclaration,
    ImportDeclaration: handleDeclaration,
    ExportAllDeclaration: handleDeclaration,

    // These are mostly to protect jest tests which tend to have different require patterns.
    ExpressionStatement: function(node) {
      if (node.expression.type === 'Literal') {
        return; // ignore 'use strict' at the top of files.
      }
      endOfRequiresReached = true;
    },
    ExportNamedDeclaration: function(node) {
      if (!node.source) {
        // "export a;" does not include a module source
        endOfRequiresReached = true;
        return;
      }
      handleDeclaration(node);
    },
    TypeAlias: function() {
      endOfRequiresReached = true;
    },
    ExportDefaultDeclaration: function() {
      endOfRequiresReached = true;
    },
    FunctionExpression: function() {
      endOfRequiresReached = true;
    },
    ArrowFunctionExpression: function() {
      endOfRequiresReached = true;
    },
    // Especially handy for things like `if (__DEV__) { foo = require('foo'); }`
    IfStatement: function() {
      endOfRequiresReached = true;
    },
    InterfaceDeclaration: function() {
      endOfRequiresReached = true;
    },

    'Program:exit': function() {
      if (allRequireBlockNodes.length < 1) {
        return;
      }
      const start = allRequireBlockNodes[0].range[0];
      const lastReq = allRequireBlockNodes[allRequireBlockNodes.length - 1];
      const trailingComment = getTrailingComment(lastReq, source);
      const end = (trailingComment || lastReq).range[1];
      const existingText = source.getText().substring(start, end);
      const sortedGroups = [];
      for (const key in sortGroups) {
        const group = sortGroups[key];
        if (group.requires.length > 0) {
          sortedGroups.push({
            text: sortBySortKey(group.requires)
              .map(({text}) => text)
              .join('\n'),
            sortKey: group.pri,
          });
        }
      }
      const replacementText = sortBySortKey(sortedGroups)
        .map(({text}) => text)
        .join('\n\n');
      if (existingText !== replacementText) {
        context.report({
          node: allRequireBlockNodes[0],
          message:
            'Imports and requires should be grouped by type and sorted alphabetically.',
          fix: function(fixer) {
            return fixer.replaceTextRange([start, end], replacementText);
          },
        });
      }
    },
  };
};
