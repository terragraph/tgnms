/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {
  ADD_FIELD_TYPES,
  PATH_DELIMITER,
} from '../constants/NetworkConfigConstants.js';
import {
  cloneDeep,
  forOwn,
  get,
  isEmpty,
  isEqual,
  isObject,
  isPlainObject,
  merge,
  omit,
  transform,
  unset,
} from 'lodash-es';

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

/**
 * Return an object without any empty nested objects
 * @param  {Object} obj
 * @return {Object}
 */
export const cleanupObject = obj => {
  if (isEmpty(obj)) {
    return null;
  }

  const cleanedObj = {};

  forOwn(obj, (value, key) => {
    if (isObject(value)) {
      if (!isEmpty(value)) {
        const cleanedValue = cleanupObject(value);
        if (cleanedValue !== null && !isEmpty(cleanedValue)) {
          cleanedObj[key] = cleanedValue;
        }
      }
    } else {
      cleanedObj[key] = value;
    }
  });

  return cleanedObj;
};

/**
 * Return a config that omits the removedFields, and adds the draftConfig fields
 * @param  {Object} config
 * @param  {Object} draftConfig
 * @param  {Set}    removedFields
 * @return {Object}
 */

export const createConfigToSubmit = (config, draftConfig, removedFields) => {
  const paths = [];

  if (removedFields) {
    removedFields.forEach(pathStr => {
      paths.push(pathStr.split(PATH_DELIMITER));
    });
  }

  const cleanedConfig = cleanupObject(omit(config, paths));
  return merge(cleanedConfig, draftConfig);
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

export const getMetadata = (metadata, fieldName) => {
  if (!metadata) {
    return null;
  }

  let fieldMetadata = {};

  if (metadata.type === 'MAP') {
    fieldMetadata = metadata.mapVal;
  } else if (metadata.type === 'OBJECT') {
    fieldMetadata = get(metadata, `objVal.properties.${fieldName}`);
  } else {
    fieldMetadata = metadata[fieldName];
  }

  if (metadata.deprecated) {
    fieldMetadata.deprecated = metadata.deprecated;
  }

  return fieldMetadata;
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

/*
  'a' and 'b' have the structure:
  {
    field: String,
    tag: String,
  }
*/
const alphabeticalSortWithTag = (a, b) => {
  const lowerAWithTag = `${a.tag}.${a.field}`.toLowerCase();
  const lowerBWithTag = `${b.tag}.${b.field}`.toLowerCase();

  if (lowerAWithTag < lowerBWithTag) {
    return -1;
  } else if (lowerAWithTag > lowerBWithTag) {
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

export const sortConfigByTag = (config, metadata = {}) => {
  const newConfig = {};

  Object.keys(config)
    .map(key => {
      const fieldMetadata = getMetadata(metadata, key);

      const tag =
        fieldMetadata && fieldMetadata.hasOwnProperty('tag')
          ? fieldMetadata.tag
          : '';

      return {
        field: key,
        tag,
      };
    })
    .sort(alphabeticalSortWithTag)
    .forEach(tagfield => {
      const key = tagfield.field;
      const value = config[key];
      const newValue = isPlainObject(value)
        ? sortConfigByTag(value, getMetadata(metadata, key) || {})
        : value;
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
    case ADD_FIELD_TYPES.RAW_JSON:
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
  if (newConfig === undefined || newConfig === null || isEmpty(newConfig)) {
    return {
      config: undefined,
      validationMsg: 'New nested object is empty',
    };
  }

  const config = {};
  const validationMsg = '';

  // for all keys in the new config object that we wish to convert
  for (const id in newConfig) {
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

// Taken from https://gist.github.com/Yimiprod/7ee176597fef230d1451#gistcomment-2565071
/**
 * Deep diff between two object, using lodash
 * @param  {Object} object Object compared
 * @param  {Object} base   Object to compare with
 * @return {Object}        Return a new object who represent the diff
 */
export function objDifference(object, base) {
  return transform(object, (result, value, key) => {
    if (!isEqual(value, base[key])) {
      result[key] =
        isObject(value) && isObject(base[key])
          ? objDifference(value, base[key])
          : value;
    }
  });
}

export function allPathsInObj(object) {
  if (!isObject(object)) {
    return null;
  }

  function allPathsInObjHelper(object, currentPath, paths) {
    forOwn(object, (value, key) => {
      if (!isObject(value)) {
        paths.push([...currentPath, key]);
      } else {
        allPathsInObjHelper(value, [...currentPath, key], paths);
      }
    });

    return paths;
  }

  return allPathsInObjHelper(object, [], []);
}
