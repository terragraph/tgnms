/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import {invert} from 'lodash-es';
import {UpgradeStatusType} from '../../thrift/gen-nodejs/Controller_types';

export type Image = {|
  hardwareBoardIds: Array<string>,
  magnetUri: string,
  md5: string,
  name: string,
|};

export const REVERT_UPGRADE_IMAGE_STATUS = 5000;
export const UPGRADE_IMAGE_REFRESH_INTERVAL = 10000;

export const BatchingType = {
  ALL_AT_ONCE: 'all_at_once',
  AUTO_LIMITED: 'auto_limited',
  AUTO_UNLIMITED: 'auto_unlimited',
};

export const UpgradeStatusToString = invert(UpgradeStatusType);

export const UploadStatus = {
  NONE: 'NONE',
  UPLOADING: 'UPLOADING',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
};
