/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @flow
 */

'use strict';

const {dirname, join, normalize, parse, sep} = require('path').posix;
const {startsWithDotDotSlash} = require('./util');

/*::
import type {ZipAccess} from '../zip';
import type {Path} from './util';
*/

const SLASH_SPLIT = /\/*(?=\/[^\/]+)/;

class ZipData {
  /*:: dirs: Set<string>; */
  /*:: files: Map<string, number>; */
  /*:: links: Map<string, string>; */
  /*:: readFile: (number, string) => Buffer; */
  /*:: _sliceOffset: number; */

  constructor(zipPath/*: string*/, access/*: ZipAccess*/) {
    const {files, links} = access.entries();
    //TODO: move this to C++?
    this.dirs = new Set(dirs(files, links));
    this.files = files;
    this.links = links;
    this.readFile = (index, debugName) => access.readFile(index, debugName);
    this._sliceOffset = zipPath.length;
  }

  entryIndex(filename/*: Path*/)/*: number*/ {
    filename = normalize(filename);

    const entryPath = this.resolveEntry(filename);
    const {files} = this;
    let index = files.get(entryPath);
    if (index == null) {
      index = files.get(this._resolveLink(entryPath));
    }
    return index == null ? -1 : index;
  }

  resolveEntry(filename/*: Path*/)/*: Path*/ {
    return filename.slice(this._sliceOffset).replace(/\/$/, '');
  }

  resolveLink(
    filename/*: Path*/,
    options/*:
      | typeof undefined
      | {resolveLastComponent: typeof undefined | boolean}*/,
  )/*: Path*/ {
    const entryPath = this.resolveEntry(filename);
    return this._resolveLink(entryPath, options);
  }

  _resolveLink(
    entryPath/*: Path*/,
    {
      resolveLastComponent = true,
    }/*: {resolveLastComponent: typeof undefined | boolean}*/ = {},
  )/*: Path*/ {
    const segments = entryPath.split(SLASH_SPLIT);
    const {links} = this;
    let resolved = '';
    for (let i = 0, n = segments.length; i < n; ++i) {
      const dir = resolved;
      resolved += segments[i];

      if (!resolveLastComponent && i + 1 === n) {
        break;
      }

      const link = links.get(resolved);
      if (link != null) {
        resolved = normalize(dir ? `${dir}/${link}` : link);
        if (startsWithDotDotSlash(resolved)) {
          throw new Error('Symlink pointing outside ZIPs are not supported');
        }
      }
    }

    return resolved;
  }
}

function* components(loc) {
  const root = parse(loc).root;
  let current = root;

  for (const part of loc.substr(root.length).split(sep)) {
    current = join(current, part);
    yield current;
  }
}

function* dirs(files, links) {
  for (const x of files.keys()) yield* components(dirname(x));
  for (const x of links.keys()) yield* components(dirname(x));
}

module.exports = ZipData;
