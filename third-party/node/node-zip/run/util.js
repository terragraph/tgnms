/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @flow
 */

"use strict";

const { resolve } = require("path");
const { promisify } = require("util");

/*::
export type EncodingOptions = ?string | {encoding: string};
export type Path = string;

type NodeJSPath = string | Buffer | URL | number;
type NodeJSCallback<T> = (Error => mixed) | ((null, T) => mixed);
type AsyncNoOpts<T> = (NodeJSPath, NodeJSCallback<T>) => void;
type AsyncWithOpts<T> = (
  NodeJSPath,
  EncodingOptions,
  NodeJSCallback<T>,
) => void;
*/

const RE_ZIP = /^.+?\.zip(\/|$)/;

function wrapSync /*::<T>*/(
  original /*: (NodeJSPath, ?EncodingOptions) => T*/,
  replacement /*: (Path, Path, ?EncodingOptions) => ?T*/,
  syscall /*: string*/
) /*: (NodeJSPath, ?EncodingOptions) => T*/ {
  return (filename, options) => {
    if (typeof filename !== "string" && !Buffer.isBuffer(filename)) {
      return original(filename, options);
    }

    filename = String(filename);
    const zip = extractZipFromPath(filename);
    if (!zip) {
      return original(filename, options);
    }

    const result = replacement(zip, filename, options);
    if (result == null) {
      throw ENOENT(filename, syscall);
    }
    return result;
  };
}

function wrapAsync /*::<T>*/(
  original /*: AsyncNoOpts<T> & AsyncWithOpts<T>*/,
  syncReplacement /*: (Path, Path, ?EncodingOptions) => ?T*/,
  syscall /*: string*/,
  exists /*: boolean*/ = false,
) /*: AsyncNoOpts<T> & AsyncWithOpts<T>*/ {
  const wrapped = (filename, ...args) => {
    if (typeof filename !== "string" && !Buffer.isBuffer(filename)) {
      return original(filename, ...args);
    }

    const name = String(filename);
    const zip = extractZipFromPath(name);
    if (!zip) {
      return original(filename, ...args);
    }

    let options /*: EncodingOptions*/, callback /*: any*/;
    if (args.length < 2) {
      callback = args[0];
    } else {
      //$FlowFixMe: Node's vararg style does not work well with Flow.
      options = args[0];
      callback = args[1];
    }

    process.nextTick(() => {
      let result;
      try {
        result = syncReplacement(zip, name, options);
      } catch (error) {
        if (exists) {
          return callback(false);
        } else {
          return callback(error);
        }
      }
      if (exists) {
        callback(result);
      } else {
        callback(null, result);
      }
    });
  };

  // Support custom promisify support in Node.js
  // https://nodejs.org/api/util.html#util_custom_promisified_functions
  if (promisify.custom in original) {
    wrapped[promisify.custom] = original[promisify.custom];
  }

  return wrapped;
}

function startsWithSlash(path /*: string*/) {
  // node.js micro-optimizes this, and so do we.
  return path.charCodeAt(0) === 47;
}

function startsWithDotSlash(path /*: string*/) {
  // node.js micro-optimizes this, and so do we.
  return 0 === ((path.charCodeAt(0) ^ 46) | (path.charCodeAt(1) ^ 47));
}

function startsWithDotDotSlash(path /*: string*/) {
  // node.js micro-optimizes this, and so do we.
  return (
    0 ===
    ((path.charCodeAt(0) ^ 46) |
      (path.charCodeAt(1) ^ 46) |
      (path.charCodeAt(2) ^ 47))
  );
}

function extractZipFromPath(filename /*: Path*/) /*: ?Path*/ {
  const match = RE_ZIP.exec(filename);
  if (match == null) {
    return null;
  } else if (startsWithSlash(match[0])) {
    return match[0];
  } else {
    return resolve(match[0]) + "/";
  }
}

function ENOENT(filename /*: Path*/, syscall /*: string*/) {
  const error/*: any*/ = new Error(
    `ENOENT: no such file or directory, ${syscall} '${filename}'`
  );
  return Object.assign((error/*: any*/), {
    code: "ENOENT",
    errno: -2,
    syscall,
    path: filename
  });
}

module.exports = {
  ENOENT,
  extractZipFromPath,
  startsWithDotDotSlash,
  startsWithDotSlash,
  startsWithSlash,
  wrapAsync,
  wrapSync
};
