/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */
'use strict';

import {UpgradeStatusTypeValueMap} from '../../shared/types/Controller';
import {invert} from 'lodash';

export const REVERT_UPGRADE_IMAGE_STATUS = 5000;
export const UPGRADE_IMAGE_REFRESH_INTERVAL = 10000;

export const BatchingType = {
  ALL_AT_ONCE: 'all_at_once',
  AUTO_LIMITED: 'auto_limited',
  AUTO_UNLIMITED: 'auto_unlimited',
};

export const UpgradeStatusToString = invert(UpgradeStatusTypeValueMap);

export const UploadStatus = {
  NONE: 'NONE',
  UPLOADING: 'UPLOADING',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
};
