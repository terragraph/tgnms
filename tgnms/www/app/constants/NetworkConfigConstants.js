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

export const CONFIG_LAYER_DESC = ['Base', 'Network Override', 'Node Override'];

// privileged value to mark a field in an override to revert
export const REVERT_VALUE = null;

export const CONFIG_CLASSNAMES = {
  MISSING: 'nc-missing-field',
  BASE: 'nc-base-field',
  NETWORK: 'nc-network-field',
  NODE: 'nc-node-field',
  DRAFT: 'nc-draft-field',
  REVERT: 'nc-revert-field',
};

export const DEFAULT_BASE_KEY = 'default';

export const ADD_FIELD_TYPES = {
  OBJECT: 'object',
  BOOLEAN: 'boolean',
  STRING: 'string',
  NUMBER: 'number',
};
