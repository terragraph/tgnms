/**
 * Generated by `js1 upgrade www-shared`.
 * @generated SignedSource<<c68bbf392c67d2623ae586f0646edb32>>
 *
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * This file is sync'd to fbsource and shouldn't contain any www-specific code.
 * If you need to www-specific utils, put them in {@link www-utils.js}
 */

'use strict';

/**
 * Safely accesses deeply nested data structures.
 * @param {object} top level object being accessed
 * @param {string} dot notation string describing data to access: 'AA.BB.c'
 * @param {boolean} create should the path be created
 * @returns {object} data accessed at the end of that path
 */
function dotAccess(head, path, create) {
  var stack = path.split('.');
  do {
    var key = stack.shift();
    head = head[key] || create && (head[key] = {});
  } while (stack.length && head);
  return head;
}

/**
 * @param {BinaryExpression|Literal} node An AST of a literal string or a
 * concatination of literal strings.
 * @returns {?string} The value of the string, or null if no string
 * expression was found.
 */
function getConstantStringExpression(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  } else if (node.type === 'BinaryExpression' && node.operator === '+') {
    var l = getConstantStringExpression(node.left);
    var r = getConstantStringExpression(node.right);
    if (l !== null && r !== null) {
      return l + r;
    }
  }
  return null;
}

/**
 * Expands an AST representing something like `foo['bar'].zoo` into a simple
 * string representation like `foo.bar.zoo`. This is useful in determining the
 * callee name even for functions on objects.
 *
 * This is similar to ESLint's `context.getSource`, except that it does a better
 * job of standardizing the resulting format, making it easier to compare
 * against. You shouldn't use this to generate pretty warning messages. Use
 * `context.getSource` for that.
 *
 * If you only want to inspect the name of one or a few trailing properties,
 * consider using `getPropertyName`.
 *
 * @param {Identifier|ThisExpression|MemberExpression} node The identifier to
 * expand.
 * @returns {?string} A simple dot-normalized representation, or null if
 * something went wrong.
 */
function getFullyQualifiedIdentifier(node) {
  if (node.type === 'Identifier') {
    return node.name;
  } else if (node.type === 'ThisExpression') {
    return 'this';
  } else if (node.type === 'MemberExpression') {
    var o = getFullyQualifiedIdentifier(node.object);
    var p = node.computed ?
      getConstantStringExpression(node.property) :
      getFullyQualifiedIdentifier(node.property);
    if (o !== null && p !== null) {
      return o + '.' + p;
    }
  }
  return null;
}

/**
 * Determines the fully qualified name of the function callee identifier.
 *
 * @param {CallExpression} node The function call AST.
 * @returns {?string} The fully qualified version of `node.callee.name`, null if
 * an error occurred.
 */
function getCalleeName(node) {
  if (!node.callee) {
    return null;
  }
  return getFullyQualifiedIdentifier(node.callee);
}

/**
 * Given a MemberExpression like `foo[bar()].baz` or `foo.bar['baz']`, returns
 * 'baz', the name of the trailing property. `getFullyQualifiedIdentifier` would
 * fail on the first example as `[bar()]` is a computed property, but we only
 * inspect the outermost MemberExpression.
 *
 * @param {MemberExpression} node We extract the property value from this.
 * @return {?string} The extracted property name, or null if we weren't passed a
 * MemberExpression, or if the property name couldn't be statically resolved.
 */
function getPropertyName(node) {
  if (node.type !== 'MemberExpression') {
    return null;
  }
  if (node.computed) {
    return getConstantStringExpression(node.property);
  }
  if (node.property.type !== 'Identifier') {
    return null;
  }
  return node.property.name;
}

/**
 * Returns a base component of a MemberExpression node.
 */
function getBaseNode(memberExpression) {
  do {
    memberExpression = memberExpression.object;
  } while (memberExpression.type === 'MemberExpression');
  return memberExpression;
}

/**
 * Takes a zero-indexed value, and converts it to a one-indexed English word for
 * that nth value. This is useful for error messages, but for implementation
 * simplicity, it only works for small values of n.
 *
 * @param {number} nth A zero-indexed integer.
 * @returns {string} A one-indexed English word for the nth position. Eg. first,
 * second, third, etc.
 */
function getEnglishForNth(nth) {
  return ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][nth];
}

/**
 * Gives the same RegExp used in eslint by context.getSourceLines().
 * https://github.com/eslint/eslint/blob/2d7d0148f9cc00b/lib/eslint.js#L744-L749
 *
 * Be aware that this has the global flag set, so you should call this function
 * before every match on a new string, as the regexp will store state. (This is
 * why we don't store the it as a constant.)
 *
 * @returns {RegExp}
 */
function _getNewlineRegExp() {
  // ES5 guarentees literal regexp objects aren't cached, so lastIndex is reset,
  // although the compilation state is cached.
  return /\r\n|\r|\n|\u2028|\u2029/g;
}

/**
 * Given a location object, gives the location as a character offset from the
 * beginning of the file.
 * @param {string} source
 * @param {Location} loc
 * @returns {number}
 */
function _locToOffset(source, loc) {
  if (loc.line < 1) {
    throw new RangeError(
      'Line number ' + loc.line + ' is before the start of file'
    );
  }
  // convert the loc object to an offset from the start of the file
  // we can't use getSourceLines(), because line endings can be multicharacter
  var re = _getNewlineRegExp();
  var match = {index: 0};
  // lines are one-indexed
  for (var i = 1; i < loc.line; ++i) {
    match = re.exec(source);
    if (match === null) {
      throw new RangeError(
        'Line number ' + loc.line + ' is past the end of file'
      );
    }
  }
  return match.index + (match[0] || '').length;
}

/**
 * Given an offset from the start of the file, computes a location with a line
 * and column number.
 * @param {string} source
 * @param {number} offset
 * @returns {Location}
 */
function _offsetToLoc(source, offset) {
  // error checking
  if (offset < 0) {
    throw new RangeError(
      'computed offset ' + offset + ' is a negative index'
    );
  } else if (offset >= source.length) {
    throw new RangeError(
      'computed offset ' + offset + ' is past the end of file'
    );
  }
  // figure out the line of offset (one-indexed)
  var re = _getNewlineRegExp();
  var prevMatch;
  var match = {index: 0};
  var line = 0;
  do {
    prevMatch = match;
    match = re.exec(source);
    ++line;
  } while (match && match.index < offset);
  return {
    line: line,
    // prevMatch points to the newline immediately before originOffsetLine
    column: offset - prevMatch.index - (prevMatch[0] || '').length,
  };
}

/**
 * Given a location object or an ASTNode and an offset, gives a location object
 * represented by that offset relative to the location or start of the ASTNode.
 *
 * This is not a very efficient implementation: do not call it in a tight loop.
 * It's probably fine for computing locations for context.report, as that's
 * (hopefully) not getting called very often.
 *
 * @param {RuleContext} context
 * @param {ASTNode|Location} loc
 * @param {number} offset
 * @returns {Location}
 */
function getLocOffset(context, loc, offset) {
  // if given an ASTNode, get the location
  loc = loc.loc || loc;
  // if given a start/end pair, get the start (context.report does this too)
  loc = loc.start || loc;
  var source = context.getSource();
  // compute the position of offset relative to the origin (beginning of file)
  var originOffset = _locToOffset(source, loc) + loc.column + offset;
  return _offsetToLoc(source, originOffset);
}

/**
 * Gets inline comments that are immediately before function parameters.
 */
function getParamComments(context, functionNode) {
  return functionNode.params.map(function(param) {
    var paramLeading = context.getComments(param).leading;
    return paramLeading[paramLeading.length - 1];
  });
}

function getReturnComment(context, functionNode) {
  return context.getComments(functionNode.body).leading[0];
}

/**
 * JSX names may often be a JSXIdentifier, JSXMemberExpression, or
 * JSXNamespacedName. In order to figure out the variable that's used in the
 * current scope, we need to find the root JSXIdentifier.
 */
function getJSXMemberOrNamespaceRoot(node) {
  // Spec: <https://github.com/facebook/jsx/blob/master/AST.md#jsx-names>
  while (node.type !== 'JSXIdentifier') {
    if (node.type === 'JSXMemberExpression') {
      node = node.object;
    } else if (node.type === 'JSXNamespacedName') {
      node = node.namespace;
    } else {
      throw new Error('unexpected ' + node.type);
    }
  }
  return node;
}

/**
 * Resolves a binding in the scope chain,
 * returns `null` it's unbound.
 */
function getBinding(scope, name) {
  var binding;
  scope.variables.some(function(variable) {
    if (variable.defs.length && variable.name === name) {
      binding = variable;
      return true;
    }
    return false;
  });

  if (binding) {
    return binding;
  }

  return scope.type === 'global' ? null : getBinding(scope.upper, name);
}

/**
 * Returns `true` if an identifier is directly
 * referenced: e.g. `foo` - true, `bar.foo` - false.
 *
 * See corresponding Babel implementation:
 * https://github.com/babel/babel/blob/master/packages/babel/src/types/validators.js#L22
 */
function isReferenced(node) {
  /*eslint no-fallthrough: 0*/
  var parent = node.parent;
  switch (parent.type) {
    // yes: PARENT[NODE]
    // yes: NODE.child
    // no: parent.NODE
    case 'MemberExpression':
    case 'JSXMemberExpression':
      if (parent.property === node && parent.computed) {
        return true;
      } else if (parent.object === node) {
        return true;
      } else {
        return false;
      }

    // no: new.NODE
    // no: NODE.target
    case 'MetaProperty':
      return false;

    // yes: { [NODE]: "" }
    // yes: { NODE }
    // no: { NODE: "" }
    case 'Property':
      if (parent.key === node) {
        return parent.computed;
      }

    // no: var NODE = init;
    // yes: var id = NODE;
    case 'VariableDeclarator':
      return parent.id !== node;

    // no: function NODE() {}
    // no: function foo(NODE) {}
    case 'ArrowFunctionExpression':
    case 'FunctionDeclaration':
    case 'FunctionExpression':
      for (var k = 0; k < parent.params.length; k++) {
        if (parent.params[k] === node) {
          return false;
        }
      }

      return parent.id !== node;

    // no: export { foo as NODE };
    // yes: export { NODE as foo };
    // no: export { NODE as foo } from "foo";
    case 'ExportSpecifier':
      if (parent.source) {
        return false;
      } else {
        return parent.local === node;
      }

    // no: <div NODE="foo" />
    case 'JSXAttribute':
      return parent.name !== node;

    // no: class { NODE = value; }
    // yes: class { key = NODE; }
    case 'ClassProperty':
      return parent.value === node;

    // no: import NODE from "foo";
    // no: import * as NODE from "foo";
    // no: import { NODE as foo } from "foo";
    // no: import { foo as NODE } from "foo";
    // no: import NODE from "bar";
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
    case 'ImportSpecifier':
      return false;

    // no: class NODE {}
    case 'ClassDeclaration':
    case 'ClassExpression':
      return parent.id !== node;

    // yes: class { [NODE](){} }
    case 'MethodDefinition':
      return parent.key === node && parent.computed;

    // no: NODE: for (;;) {}
    case 'LabeledStatement':
      return false;

    // no: try {} catch (NODE) {}
    case 'CatchClause':
      return parent.param !== node;

    // no: function foo(...NODE) {}
    case 'RestElement':
      return false;

    // yes: left = NODE;
    // no: NODE = right;
    case 'AssignmentExpression':
      return parent.right === node;

    // no: [NODE = foo] = [];
    // yes: [foo = NODE] = [];
    case 'AssignmentPattern':
      return parent.right === node;

    // no: [NODE] = [];
    // no: ({ NODE }) = [];
    case 'ObjectPattern':
    case 'ArrayPattern':
      return false;
  }

  return true;
}

/**
 * If this is a require() call, returns the module name being required.
 * Otherwise, returns `null`.
 *
 * @param {ASTNode} node
 * @returns {?string}
 */
function getRequireModuleName(node) {
  var isRequire =
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.name === 'require' &&
    node.arguments.length === 1;
  return isRequire ? node.arguments[0].value : null;
}

/**
 * Whether or not the current context is inside of a method with the given name.
 *
 * @param {RuleContext} context
 * @returns {boolean}
 */
function isInsideMethod(context, methodName) {
  const ancestors = context.getAncestors();
  return ancestors.some(ancestor => {
    return ancestor.type === 'MethodDefinition' &&
      ancestor.key.name === methodName;
  });
}

/**
 * The class name that we are currently inside, or null if not inside a class
 * declaration.
 *
 * @param {RuleContext} context
 * @returns {?string}
 */
function getCurrentClassName(context) {
  const ancestors = context.getAncestors();
  const classNode = ancestors.find(
    ancestor => ancestor.type === 'ClassDeclaration'
  );
  if (!classNode) {
    return null;
  }

  return classNode.id.name;
}

/**
 * Returns the string tag for the object.
 *
 * @param {any} object
 */
function _getClass(object) {
  return Object.prototype.toString.call(object).slice(8, -1);
}

/**
 * Returns true
 * - if a and b are primitives and equal
 * - if a and b are arrays and b is a prefix of a
 * - if a and b are objects and matchShape(a[k], b[k]) for all key k of b.
 *
 * @param {object|array|string|number} a
 * @returns {object|array|string|number} b
 */
function matchShape(a, b) {
  const aClass = _getClass(a);
  const bClass = _getClass(b);

  if (aClass !== bClass) {
    return false;
  }

  switch (aClass) {
    case 'Array':
      if (
        !Array.isArray(a) ||
        !Array.isArray(b) ||
        a.length < b.length
      ) {
        return false;
      }
      for (let i = 0; i < a.length && i < b.length; i++) {
        if (!matchShape(a[i], b[i])) {
          return false;
        }
      }
      return true;
    case 'Object':
      for (const key in b) {
        if (!matchShape(a[key], b[key])) {
          return false;
        }
      }
      return true;
    default:
      return a === b;
  }
}

/**
 * eslint v3 only supports a single fixer per rule, v4 allows `fix()` to
 * return an array with multiple fixers; this function will combine all the
 * results from `fixer` calls into a single operation (mimicking the v4
 * behavior)
 *
 * @param {SourceCode} sourceCode
 * @param {Array<?{range: [number, number], text: string}>} fixes
 * @returns ?{range: [number, number], text: string}
 */
function mergeFixes(sourceCode, fixes) {
  fixes = fixes.filter(Boolean).sort((a, b) => {
    return a.range[0] - b.range[0] || a.range[1] - b.range[1];
  });

  if (!fixes.length) {
    return null;
  }

  const sourceText = sourceCode.getText();

  let lastPos = fixes[0].range[0];
  let text = '';

  fixes.forEach(fix => {
    const start = fix.range[0];
    const end = fix.range[1];

    if (lastPos > start || start > end) {
      throw new Error('can\'t merge overlapping ranges');
    }

    text += sourceText.slice(lastPos, start);
    text += fix.text;
    lastPos = end;
  });

  return {
    range: [
      fixes[0].range[0],
      fixes[fixes.length - 1].range[1],
    ],
    text,
  };
}

// Descend through all wrapping TypeCastExpressions and return the expression
// that was cast.
function uncast(node) {
  while (node.type === 'TypeCastExpression') {
    node = node.expression;
  }
  return node;
}

// Return the name of an identifier or the string value of a literal. Useful
// anywhere that a literal may be used as a key (e.g., member expressions,
// method definitions, ObjectExpression property keys).
function getName(node) {
  node = uncast(node);
  if (node.type === 'Identifier') {
    return node.name;
  } else if (node.type === 'Literal') {
    return '' + node.value;
  }
  return null;
}

function isThisExpression(node) {
  return uncast(node).type === 'ThisExpression';
}

function isTestOrExample(context) {
  const filename = context.getFilename();
  return (
    filename.match(/\/__tests__\//) || filename.match(/\.react\.example\.js/)
  );
}

module.exports = {
  dotAccess,
  getBaseNode,
  getBinding,
  getCalleeName,
  getConstantStringExpression,
  getCurrentClassName,
  getEnglishForNth,
  getFullyQualifiedIdentifier,
  getJSXMemberOrNamespaceRoot,
  getLocOffset,
  getName,
  getParamComments,
  getPropertyName,
  getRequireModuleName,
  getReturnComment,
  isInsideMethod,
  isReferenced,
  isTestOrExample,
  isThisExpression,
  matchShape,
  mergeFixes,
  uncast,
};
