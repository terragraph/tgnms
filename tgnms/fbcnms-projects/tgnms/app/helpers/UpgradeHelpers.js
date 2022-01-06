/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as nodeImageApiUtil from '@fbcnms/tg-nms/app/apiutils/NodeImageAPIUtil';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {objectEntriesTypesafe} from './ObjectHelpers';
import type {UpgradeImageType} from '@fbcnms/tg-nms/shared/types/Controller';

export type SoftwareImageType = {|
  versionNumber?: string,
  fileName?: string,
  uploadedDate?: Date,
  ...UpgradeImageType,
|};

/** Fetches upgrade images. */
export function fetchUpgradeImages(
  networkName: string,
  onResponse: (images: Array<SoftwareImageType>) => any,
) {
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

// export type SoftwarePortalFile = {
//   description: string,
//   filesize: number,
//   shasum: string,
//   uploaded_by: string,
//   uploaded_date: number,
//   url: string,
// };

/* fetches image data from the software portal */
export function fetchSoftwarePortalImages(
  data: {suite: string},
  onResponse: (Array<SoftwareImageType>) => any,
) {
  nodeImageApiUtil
    .getImages(data)
    .then(response => {
      const images = objectEntriesTypesafe(response).reduce(
        (images: Array<SoftwareImageType>, [release, files]) => {
          const fileName = 'tg-update-armada39x.bin';
          const metadata = files[fileName];

          const uploadedDate = new Date(0);
          uploadedDate.setUTCSeconds(metadata.uploaded_date);
          return images.concat({
            name: `Software Portal Image Release ${release}`,
            magnetUri: '',
            md5: '',
            hardwareBoardIds: [],
            versionNumber: release,
            fileName: fileName,
            uploadedDate: uploadedDate,
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
