/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../apiutils/ServiceAPIUtil';

import {nodeupdateServerRequest} from '../apiutils/NodeupdateAPIUtil';

/** Fetches upgrade images. */
export function fetchUpgradeImages(networkName, onResponse) {
  apiServiceRequest(networkName, 'listUpgradeImages')
    .then(response => {
      // Sort images by name
      const {images} = response.data;
      images.sort((a, b) => b.name.localeCompare(a.name));

      onResponse(images);
    })
    .catch(error => {
      console.error(
        'Failed to fetch upgrade images',
        getErrorTextFromE2EAck(error),
      );
    });
}

/* fetches image data from the software portal */
export function fetchSoftwarePortalImages(data, onResponse) {
  nodeupdateServerRequest('list', data)
    .then(response => {
      const images = Object.entries(response.data).reduce(
        (images, imageData) => {
          const release = imageData[0];
          const metadata = imageData[1]['tg-update-armada39x.bin'];

          return images.concat({
            name: `Software Portal Image Release ${release}`,
            magnetUri: '',
            md5: '',
            sha1: metadata.shasum,
            hardwareBoarIds: [],
            versionNumber: release,
          });
        },
        [],
      );
      onResponse(images);
    })
    .catch(error => {
      console.error(
        'Failed to fetch software portal image data',
        getErrorTextFromE2EAck(error),
      );
    });
}
