/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @flow
 */

"use strict";

/*::
export type Entries = {
  files: Map<string, number>,
  links: Map<string, string>,
};

declare class ZipAccess {
  constructor(zipFile: string): ZipAccess;
  entries(): Entries;
  readFile(index: number, filenameDebug?: string): Buffer;
}

declare class ZipBuild {
  constructor(zipFile: string): ZipBuild;
  add(
    sourcePath: string,
    entryName: string,
    compressionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
  ): void;
  append(zipPath: string, prefix?: ?string): void;
  writeAndClose(): void;
}
*/

const os = require("os");
//$FlowFixMe: dynamic require needed to include platform-specific code
const native = require(`./${os.platform()}-${os.arch()}/zip.node`);

module.exports = (native /*: {
  ZipAccess: Class<ZipAccess>,
  ZipBuild: Class<ZipBuild>,
}*/);
