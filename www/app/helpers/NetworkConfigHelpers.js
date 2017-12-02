var _ = require('lodash');

export const getImageVersionsForNetwork = (topology) => {
  if (!topology || !topology.nodes) {
    return [];
  }

  const imageVersions = topology.nodes.filter((node) => {
    return node.status_dump;
  }).map((node) => {
    return node.status_dump.version;
  });

  const dedupedImageVersions = new Set(imageVersions);
  return [...dedupedImageVersions];
}

// unsets the property in obj retrieved using editPath
// then cleans up all empty objects within obj
export const unsetAndCleanup = (obj, editPath, stopIdx) => {
  let cleanedObj = _.cloneDeep(obj);

  let newEditPath = [...editPath]; // copy the editpath as we need to change the copy
  if (newEditPath.length === 0) {
    console.error(`error, editPath cannot be empty`);
  }

  const isValueUnset = _.unset(cleanedObj, newEditPath);
  if (!isValueUnset) {
    console.error(`could not unset value at path ${newEditPath} for object ${cleanedObj}`);
  }

  // hack for flag for stopIdx, this means we do not clean up any empty objects
  if (stopIdx === -1) {
    return cleanedObj;
  }

  // if we're here then the value in cleanedObj specified by editPath is unset
  // we then clean up to remove any empty objects
  newEditPath.pop();
  while (newEditPath.length > stopIdx && Object.keys( _.get(cleanedObj, newEditPath) ).length === 0) {
    _.unset(cleanedObj, newEditPath);
    newEditPath.pop();
  }

  return cleanedObj;
}

export const getStackedFields = (configs) => {
  // aggregate all config fields
  const stackedFields = configs.reduce((stacked, config) => {
    return [...stacked, ...Object.keys(config)];
  }, []);

  // now dedupe the fields by adding to a set
  const dedupedFields = new Set(stackedFields);
  return [...dedupedFields];
}

const alphabeticalSort = (a, b) => {
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase()
  if (lowerA < lowerB) {
    return -1;
  } else if (lowerA > lowerB) {
    return 1;
  }
  return 0;
}

export const sortConfig = (config) => {
  let newConfig = {};

  Object.keys(config).sort(alphabeticalSort).forEach((key) => {
    const value = config[key];
    const newValue = _.isPlainObject(value) ? sortConfig(value) : value;
    newConfig[key] = newValue;
  });

  return newConfig;
}
