/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import axios from 'axios';

export type GetImagesReq = {suite: string};

export type SoftwarePortalFile = {
  description: string,
  filesize: number,
  shasum: string,
  uploaded_by: string,
  uploaded_date: number,
  url: string,
};

export type SoftwarePortalResponse = {[string]: {[string]: SoftwarePortalFile}};

export async function getImages(
  req: GetImagesReq,
): Promise<SoftwarePortalResponse> {
  const response = await axios.post<GetImagesReq, SoftwarePortalResponse>(
    `/nodeimage/listUpgradeImages`,
    req,
  );
  return response.data;
}
