/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

export type Version = {|major: number, minor: number|};

export const CtrlVerType: {[string]: Version} = {
  M29: {major: 29, minor: -1},
  M30: {major: 30, minor: -1},
  M31: {major: 31, minor: -1},
  M37: {major: 37, minor: -1},
  M38: {major: 38, minor: -1},
  M41: {major: 41, minor: -1},
  M43: {major: 43, minor: -1},
};

/**
 * Parse the given version string into a major and minor version.
 */
export function getVersion(versionStr: string): Version {
  const version = {major: -1, minor: -1};
  if (!versionStr) {
    return version;
  }
  const regExp = /RELEASE_M(\d+)(_(\d+))?/;
  const matches = regExp.exec(versionStr);
  if (matches === null) {
    return version;
  }
  if (matches[1]) {
    version.major = parseInt(matches[1], 10);
  }
  if (matches[3]) {
    version.minor = parseInt(matches[3], 10);
  }
  return version;
}

export function ctrlVerAfter(versionStr: string, testVersion: Version) {
  const version = getVersion(versionStr);
  return (
    version.major > testVersion.major ||
    (version.major == testVersion.major && version.minor > testVersion.minor)
  );
}

export function ctrlVerEqual(versionStr: string, testVersion: Version) {
  const version = getVersion(versionStr);
  return (
    version.major == testVersion.major && version.minor == testVersion.minor
  );
}

export function ctrlVerBefore(versionStr: string, testVersion: Version) {
  const version = getVersion(versionStr);
  return (
    version.major < testVersion.major ||
    (version.major == testVersion.major && version.minor < testVersion.minor)
  );
}

/**
 * Return the given version object (from getVersion()) as a version number.
 *   ex. "31", "20.1", "?"
 */
export function getVersionNumber(version: Version) {
  return version.major >= 0
    ? [version.major, ...(version.minor >= 0 ? [version.minor] : [])].join('.')
    : '?';
}

/**
 * Cut off the prefix of a software version string.
 *   ex. "Facebook Terragraph Release RELEASE_M31_PRE-22-gd68c99b3f ..."
 *       -> "M31_PRE-22-gd68c99b3f ..."
 */
export function shortenVersionString(versionStr: string) {
  const releaseIdx = versionStr.indexOf('RELEASE_');
  return releaseIdx === -1 ? versionStr : versionStr.substring(releaseIdx + 8);
}
