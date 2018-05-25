/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {ADD_FIELD_TYPES} from '../constants/NetworkConfigConstants.js';
import cloneDeep from 'lodash-es/cloneDeep';
import get from 'lodash-es/get';
import isPlainObject from 'lodash-es/isPlainObject';
import unset from 'lodash-es/unset';

export const getImageVersionsForNetwork = topology => {
  if (!topology || !topology.nodes) {
    return [];
  }

  const imageVersions = topology.nodes
    .filter(node => {
      return node.status_dump;
    })
    .map(node => {
      return node.status_dump.version;
    });

  const dedupedImageVersions = new Set(imageVersions);
  return [...dedupedImageVersions];
};

// unsets the property in obj retrieved using editPath
// then cleans up all empty objects within obj
export const unsetAndCleanup = (obj, editPath, stopIdx) => {
  const cleanedObj = cloneDeep(obj);

  const newEditPath = [...editPath]; // copy the editpath as we need to change the copy
  if (newEditPath.length === 0) {
    console.error('error, editPath cannot be empty');
  }

  const isValueUnset = unset(cleanedObj, newEditPath);
  if (!isValueUnset) {
    console.error(
      `could not unset value at path ${newEditPath} for object ${cleanedObj}`,
    );
  }

  // hack for flag for stopIdx, this means we do not clean up any empty objects
  if (stopIdx === -1) {
    return cleanedObj;
  }

  // if we're here then the value in cleanedObj specified by editPath is unset
  // we then clean up to remove any empty objects
  newEditPath.pop();
  while (
    newEditPath.length > stopIdx &&
    Object.keys(get(cleanedObj, newEditPath)).length === 0
  ) {
    unset(cleanedObj, newEditPath);
    newEditPath.pop();
  }

  return cleanedObj;
};

export const getStackedFields = (configs, viewOverridesOnly) => {
  // aggregate all config fields
  const stackedFields = configs.reduce((stacked, config) => {
    return isPlainObject(config)
      ? [...stacked, ...Object.keys(config)]
      : stacked;
  }, []);

  // now dedupe the fields by adding to a set
  const dedupedFields = new Set(stackedFields);
  return [...dedupedFields];
};

const alphabeticalSort = (a, b) => {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  if (lowerA < lowerB) {
    return -1;
  } else if (lowerA > lowerB) {
    return 1;
  }
  return 0;
};

export const sortConfig = config => {
  const newConfig = {};

  Object.keys(config)
    .sort(alphabeticalSort)
    .forEach(key => {
      const value = config[key];
      const newValue = isPlainObject(value) ? sortConfig(value) : value;
      newConfig[key] = newValue;
    });

  return newConfig;
};

export const getDefaultValueForType = type => {
  let defaultValue = '';
  switch (type) {
    case ADD_FIELD_TYPES.OBJECT:
      defaultValue = {};
      break;
    case ADD_FIELD_TYPES.BOOLEAN:
      defaultValue = true;
      break;
    case ADD_FIELD_TYPES.NUMBER:
      defaultValue = 0;
      break;
    case ADD_FIELD_TYPES.STRING:
      defaultValue = '';
      break;
    default:
      console.error('Error, invalid type detected for adding a new field');
  }

  return defaultValue;
};

/*
  converts a new config object into a more "plain" javascript object
  returns: {
    config: the config that is converted, if valid. if not valid, then undefined
    validationMsg: empty string if config is valid, something else if not
  }
*/
export const convertAndValidateNewConfigObject = newConfig => {
  // newConfig is a map of id => {id, type, field, value}

  // empty/null check
  if (
    newConfig === undefined ||
    newConfig === null ||
    Object.keys(newConfig).length === 0
  ) {
    return {
      config: undefined,
      validationMsg: 'New config is empty',
    };
  }

  const config = {};
  const validationMsg = '';

  // for all keys in the new config object that we wish to convert
  for (var id in newConfig) {
    const {type, field, value} = newConfig[id];
    // check for empty and duplicate fields, and terminate if we encounter them
    if (config.hasOwnProperty(field)) {
      return {
        config: undefined,
        validationMsg: `Duplicate field ${field} detected, Please rename the field`,
      };
    } else if (field === '') {
      return {
        config: undefined,
        validationMsg:
          'Field cannot be empty. Please provide a name for the field',
      };
    }

    if (type === ADD_FIELD_TYPES.OBJECT) {
      // recurse on the nested object
      const nestedConfig = convertAndValidateNewConfigObject(value);
      // first check if the nested object has any errors while converting, and cascade the error returned if an error exists
      if (nestedConfig.config === undefined) {
        return nestedConfig;
      }
      // no errors: set the value (object)
      config[field] = nestedConfig.config;
    } else {
      // just set the value as it's a primitive type
      config[field] = value;
    }
  }

  return {config, validationMsg};
};
