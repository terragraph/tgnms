/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @flow
 */

"use strict";

/*::
import type {ReadFileSync} from './types';
import type {EncodingOptions, Path} from './util';
*/

const { realpathSync } = require("fs");
const ZipData = require("./ZipData");
const { ZipAccess } = require("../zip");
const { ENOENT, wrapSync } = require("./util");

// $FlowFixMe(T29851441) This exists in secret
const preserveSymlinks = Boolean(process.binding("config").preserveSymlinks);
const NO_MODULE_DIR = [];

const STAT_COMMON = {
  mtime: new Date(0),
  isFIFO: () => false,
};
const STAT_FILE = Object.freeze({
  isFile: () => true,
  isDirectory: () => false,
  isSymbolicLink: () => false,
  ... STAT_COMMON,
});
const STAT_DIRECTORY = Object.freeze({
  isFile: () => false,
  isDirectory: () => true,
  isSymbolicLink: () => false,
  ... STAT_COMMON,
});
const STAT_SYMBOLIC_LINK = Object.freeze({
  isFile: () => false,
  isDirectory: () => false,
  isSymbolicLink: () => true,
  ... STAT_COMMON,
});

class ZipRuntime {
  /*:: exists: typeof ZipRuntime.prototype._exists; */
  /*:: readFile: typeof ZipRuntime.prototype._readFile; */
  /*:: realpath: typeof ZipRuntime.prototype._realpath; */
  /*:: stat: typeof ZipRuntime.prototype._stat; */
  /*:: lstat: typeof ZipRuntime.prototype._lstat; */
  /*:: readdir: typeof ZipRuntime.prototype._readdir; */
  /*:: readlink: typeof ZipRuntime.prototype._readlink; */
  /*:: fsReadFileSync: ReadFileSync; */
  /*:: _extensions: Array<string>; */
  /*:: _zips: Map<string, ZipData>; */

  constructor(extensions /*: Array<string>*/, readFileSync /*: ReadFileSync*/) {
    this._extensions = extensions;
    this.exists = (x, y) => this._exists(x, y);
    this.readFile = (x, y, z) => this._readFile(x, y, z);
    this.realpath = (x, y, z) => this._realpath(x, y, z);
    this.stat = (x, y) => this._stat(x, y);
    this.lstat = (x, y) => this._lstat(x, y);
    this.readdir = (x, y) => this._readdir(x, y);
    this.readlink = (x, y) => this._readlink(x, y);
    this._zips = new Map();

    const fsReadFileSync = wrapSync(readFileSync, this.readFile, "open");
    //$FlowFixMe Node's dynamic function signatures don't work well with Flow.
    this.fsReadFileSync = fsReadFileSync;
  }

  findPath(
    zip /*: Path*/,
    request /*: string*/,
    basedir /*: Path*/,
    isMain /*: boolean*/
  ) /*: Path*/ {
    const resolveSync = require("resolve").sync;
    return resolveSync(request, {
      basedir,
      extensions: this._extensions,
      isFile: x => this.isFile(zip, x),
      preserveSymlinks: preserveSymlinks && !isMain,
      readFileSync: this.fsReadFileSync
    });
  }

  findPathNodeModule(
    zip /*: Path*/,
    request /*: string*/,
    paths /*: Array<Path>*/,
    isMain /*: boolean*/
  )/*: Path*/ {
    const resolveSync = require("resolve").sync;
    return resolveSync(request, {
      basedir: "/", // avoids `path.parse` calls
      extensions: this._extensions,
      isFile: x => this.isFile(zip, x),
      moduleDirectory: NO_MODULE_DIR, // avoids looking into paths other than `paths`
      paths,
      preserveSymlinks: preserveSymlinks && !isMain,
      readFileSync: this.fsReadFileSync
    });
  }

  isFile(zip /*: Path*/, filename /*: Path*/)/*: boolean*/ {
    return (
      filename.startsWith(zip) && this._loadZip(zip).entryIndex(filename) !== -1
    );
  }

  listing(zip /*: Path*/) /*: Array<string>*/ {
    const zipData = this._loadZip(zip.replace(/\/?$/, "/"));
    return Array.from(zipData.files.keys());
  }

  _exists(zip /*: Path*/, filename /*: Path*/) /*: boolean*/ {
    const zipData = this._loadZip(zip);
    if (zipData.files.has(filename) || zipData.dirs.has(filename)) {
      return true;
    }
    const resolved = zipData.resolveLink(filename);
    if (zipData.files.has(resolved) || zipData.dirs.has(resolved) || resolved === '') {
      return true;
    }
    return false;
  }

  _readlink(zip /*: Path*/, filename /*: string*/) /*: string*/ {
    const zipData = this._loadZip(zip);
    const resolved = zipData.resolveLink(filename, {resolveLastComponent: false});

    const link = zipData.links.get(resolved);

    if (!link)
      throw new Error(`Not a symlink`);

    return link;
  }

  _stat(zip /*: Path*/, filename /*: Path*/) /*: ?typeof STAT_FILE*/ {
    const zipData = this._loadZip(zip);
    const resolved = zipData.resolveLink(filename);

    if (resolved === '') {
      return STAT_DIRECTORY;
    }

    if (zipData.dirs.has(resolved)) {
      return STAT_DIRECTORY;
    } else if (zipData.files.has(resolved)) {
      return STAT_FILE;
    }

    return null;
  }

  _lstat(zip /*: Path*/, filename /*: Path*/) /*: ?typeof STAT_FILE*/ {
    const zipData = this._loadZip(zip);
    const resolved = zipData.resolveLink(filename, {
      resolveLastComponent: false
    });

    if (resolved === '') {
      return STAT_DIRECTORY;
    }

    if (zipData.dirs.has(resolved)) {
      return STAT_DIRECTORY;
    } else if (zipData.files.has(resolved)) {
      return STAT_FILE;
    } else if (zipData.links.has(resolved)) {
      return STAT_SYMBOLIC_LINK;
    }

    return null;
  }

  _readdir(zip /*: Path*/, filename /*: Path*/) /*: Array<string>*/ {
    const zipData = this._loadZip(zip);
    const resolved = zipData.resolveLink(filename);

    if (!zipData.dirs.has(resolved) && resolved !== '') {
      throw ENOENT(filename, 'readdir');
    }

    const withSlash = resolved + "/";
    const directoryEntries = [];

    const allCandidates = [
      ... zipData.dirs.keys(),
      ... zipData.files.keys(),
      ... zipData.links.keys(),
    ];

    for (const candidate of allCandidates) {
      if (withSlash.length >= candidate.length) {
        continue;
      }
      if (!candidate.startsWith(withSlash)) {
        continue;
      }
      const candidateName = candidate.substr(withSlash.length);
      if (candidateName.indexOf("/") !== -1) {
        continue;
      }
      directoryEntries.push(candidateName);
    }

    return directoryEntries;
  }

  _readFile(
    zip /*: Path*/,
    filename /*: Path*/,
    options /*: EncodingOptions | typeof undefined*/
  ) /*: null | string | Buffer*/ {
    const zipData = this._loadZip(zip);
    const index = zipData.entryIndex(filename);
    if (index < 0) {
      throw ENOENT(filename, "open");
    } else {
      return encode(zipData.readFile(index, filename), options);
    }
  }

  _realpath(
    zip /*: Path*/,
    filename /*: Path*/,
    options /*: EncodingOptions*/
  ) /*: ?string | Buffer*/ {
    const zipData = this._loadZip(zip);
    const resolved = zipData.resolveLink(filename);
    if (resolved === '') {
      return realpathSync(zip);
    } else if (!zipData.files.has(resolved) && !zipData.dirs.has(resolved)) {
      throw ENOENT(filename, "lstat");
    } else {
      return decode(`${realpathSync(zip)}/${resolved}`, options);
    }
  }

  _loadZip(zipPath /*: Path*/) /*: ZipData*/ {
    let data = this._zips.get(zipPath);
    if (data != null) {
      return data;
    }
    const resolved = realpathSync(zipPath);
    const access = new ZipAccess(resolved);
    data = new ZipData(zipPath, access);
    this._zips.set(zipPath, data);
    return data;
  }
}

function decode(
  string /*: string*/,
  options /*: EncodingOptions*/
) /*: string | Buffer*/ {
  return options === "buffer" || (options && options.encoding === "buffer")
    ? Buffer.from(string, "utf8")
    : string;
}

function encode(
  buffer /*: Buffer*/,
  options /*: EncodingOptions*/
) /*: string | Buffer*/ {
  return options == null ||
    (typeof options !== "string" && typeof options.encoding !== "string")
    ? buffer
    : //$FlowFixMe: Flow's encoding definitions of fs + Buffer are disjoint.
      buffer.toString(typeof options == "string" ? options : options.encoding);
}

module.exports = ZipRuntime;
