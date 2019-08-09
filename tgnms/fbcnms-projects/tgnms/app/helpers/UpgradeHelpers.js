/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../apiutils/ServiceAPIUtil';

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
