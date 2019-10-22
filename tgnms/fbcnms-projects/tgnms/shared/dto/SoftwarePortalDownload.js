/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

export const DownloadStatus = {
  DOWNLOADING: 'DOWNLOADING',
  FINISHED: 'FINISHED',
  ERROR: 'ERROR',
};

/*
 * Identifies a software portal image download so the websocket listener can
 * listen for progress messages
 */
export type ImageIdentifier = {
  // image name
  name: string,
  // version number string
  release: string,
  networkName: string,
};

/*
 * The progress/status of controller downloading an official release
 * from the software portal.
 */
export type SoftwarePortalDownloadMessage = {
  // progress percentage
  progressPct: number,
  status: $Values<typeof DownloadStatus>,
  message?: string,
};

export function getWebSocketGroupName({
  networkName,
  name,
  release,
}: ImageIdentifier) {
  return `swprogress-${networkName}-${name}-${release}`;
}
