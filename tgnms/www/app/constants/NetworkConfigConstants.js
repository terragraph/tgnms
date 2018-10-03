/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

export const CONFIG_VIEW_MODE = {
  NETWORK: 'NETWORK',
  NODE: 'NODE',
};

export const CONFIG_LAYER_DESC = [
  'Base Value',
  'Auto Override',
  'Network Override',
  'Node Override',
];

export const PATH_DELIMITER = '\0';

export const CONFIG_CLASSNAMES = {
  MISSING: 'nc-missing-field',
  BASE: 'nc-base-field',
  NETWORK: 'nc-network-field',
  NODE: 'nc-node-field',
  AUTO: 'nc-auto-field',
  DRAFT: 'nc-draft-field',
  REVERT: 'nc-revert-field',
};

export const DEFAULT_BASE_KEY = 'default';
export const DEFAULT_HARDWARE_BASE_KEY = 'MVL_ARMADA39X_P';

export const ADD_FIELD_TYPES = {
  OBJECT: 'object',
  BOOLEAN: 'boolean',
  STRING: 'string',
  NUMBER: 'number',
  RAW_JSON: 'raw_json',
};
