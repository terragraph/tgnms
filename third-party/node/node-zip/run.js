/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @flow
 */

"use strict";

const ZipRuntime = require("./run/ZipRuntime");
const pathResolve = require("path").resolve;
const {
  extractZipFromPath,
  startsWithDotDotSlash,
  startsWithDotSlash,
  startsWithSlash,
  wrapAsync,
  wrapSync
} = require("./run/util");

/*::
import type {EncodingOptions, Path} from './run/util';
*/

function monkeyPatch(Module, fs, runtime /*: ZipRuntime*/) {
  const existsSync = wrapSync(
    (fs.existsSync /*: $FlowFixMe*/),
    runtime.exists,
    "stat"
  );
  const exists = wrapAsync(
    (fs.exists/*: $FlowFixMe*/),
    runtime.exists,
    "stat",
    true
  );
  const readFile = wrapAsync(
    (fs.readFile /*: $FlowFixMe*/),
    runtime.readFile,
    "open"
  );
  const realpathSync = wrapSync(
    (fs.realpathSync /*: $FlowFixMe*/),
    runtime.realpath,
    "lstat"
  );
  const realpath = wrapAsync(
    (fs.realpath /*: $FlowFixMe*/),
    runtime.realpath,
    "lstat"
  );

  const stat = wrapAsync((fs.stat /*: $FlowFixMe*/), runtime.stat, "stat");
  const statSync = wrapSync(
    (fs.statSync /*: $FlowFixMe*/),
    runtime.stat,
    "stat"
  );
  const lstat = wrapAsync((fs.lstat /*: $FlowFixMe*/), runtime.lstat, "lstat");
  const lstatSync = wrapSync(
    (fs.lstatSync /*: $FlowFixMe*/),
    runtime.lstat,
    "stat"
  );
  const readdir = wrapAsync(
    (fs.readdir /*: $FlowFixMe*/),
    runtime.readdir,
    "stat"
  );
  const readdirSync = wrapSync(
    (fs.readdirSync /*: $FlowFixMe*/),
    runtime.readdir,
    "stat"
  );
  const readlink = wrapAsync(
    (fs.readlink /*: $FlowFixMe*/),
    runtime.readlink,
    "readlink"
  );
  const readlinkSync = wrapSync(
    (fs.readlinkSync /*: $FlowFixMe*/),
    runtime.readlink,
    "readlink"
  );

  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.exists = exists;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.existsSync = existsSync;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.readFileSync = runtime.fsReadFileSync;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.readFile = readFile;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.realpathSync = realpathSync;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.realpath = realpath;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.stat = stat;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.statSync = statSync;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.lstat = lstat;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.lstatSync = lstatSync;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.readdir = readdir;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.readdirSync = readdirSync;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.readlink = readlink;
  //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
  fs.readlinkSync = readlinkSync;

  const { _findPath } = Module;
  Module._findPath = (
    request /*: string*/,
    paths /*: Array<string>*/,
    isMain /*: boolean*/
  ) => {
    const { length } = request;
    if (length > 0 && startsWithSlash(request)) {
      // absolute paths

      const zip = extractZipFromPath(request);
      if (zip) {
        return runtime.findPath(zip, request, "/", isMain);
      }
    } else if (
      (length > 1 && startsWithDotSlash(request)) ||
      (length > 2 && startsWithDotDotSlash(request))
    ) {
      // relative imports
      if (paths && paths.length > 0) {
        const zip = extractZipFromPath(pathResolve(paths[0], request));
        if (zip) {
          return runtime.findPath(zip, request, paths[0], isMain);
        }
      }
    } else if (paths) {
      // node module imports
      // consume the paths within any zip archives.
      const { index, zip } = findZipPath(paths);
      if (zip != null) {
        const zipPaths = paths.splice(0, index);
        return runtime.findPathNodeModule(zip, request, zipPaths, isMain);
      }
    }
    return _findPath(request, paths, isMain);
  };
}

function findZipPath(paths /*: Array<Path>*/) {
  let zip = null;
  for (let i = 0, n = paths.length; i < n; ++i) {
    const z = extractZipFromPath(paths[i]);
    if (z == null) {
      return { index: i, zip };
    }
    zip = z;
  }

  return { index: -1, zip };
}

//$FlowFixMe
const Module = require("module");
const fs = require("fs");
const runtime = new ZipRuntime(
  Object.keys(Module._extensions),
  fs.readFileSync
);

monkeyPatch(Module, require("fs"), runtime);

exports.run = function run() {
  // remove this script from process.argv
  process.argv.splice(1, 1);

  // make script path absolute
  process.argv[1] = pathResolve(process.argv[1]);

  // makes sure that subprocesses start up go through zipstorage/run.
  process.execArgv.push(__filename);

  // run the entry point as main module
  Module.runMain();
};

exports.listFiles = function listFiles(zip /*: Path*/) /*: Array<string>*/ {
  return runtime.listing(zip);
};

if (module === require.main) {
  exports.run();
}
