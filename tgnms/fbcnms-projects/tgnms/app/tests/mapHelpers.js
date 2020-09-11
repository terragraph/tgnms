/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import MapboxGlMock from 'mapbox-gl';
import type {GeoFeatureCollection} from '@turf/turf';

/**
 * Get the mapbox gl layer with the specified id
 */
export function getLayerById(container: HTMLElement, id: string): ?HTMLElement {
  return container.querySelector(`[data-mapbox-type="layer"][data-id="${id}"]`);
}

export function getSourceById(
  container: HTMLElement,
  id: string,
): ?HTMLElement {
  return container.querySelector(
    `[data-mapbox-type="source"][data-id="${id}"]`,
  );
}

/**
 * Queries a line in the links layer by link name
 */
export function getLineByLinkName(
  layer: HTMLElement,
  linkName: string,
): NodeList<HTMLElement> {
  return layer.querySelectorAll(
    `[data-mapbox-type="feature"][data-test-link-name="${linkName}"]`,
  );
}

/**
 * Queries feature by site name.
 * When a link overlay is metric based, the line will be split at the midpoint,
 * one segment will go to the midpoint and be colored via site A's metrics,
 * the other will be colored with site Z's metrics.
 */
export function getFeatureBySiteName(
  layer: HTMLElement,
  siteName: string,
): ?HTMLElement {
  return layer.querySelector(
    `[data-mapbox-type="feature"][data-test-site-name="${siteName}"]`,
  );
}

/**
 * Queries a layer using multiple attributes. Pass a map of attribute
 * key, value pairs to construct a query for the element matching all
 * attributes.
 * Example:
 * <Feature test-site-layer="circle" test-site-name="site1"/>
 *
 * getFeatureByAttributes(layer, {
 *   'test-site-layer':circle,
 *   'test-site-name':'site1'}
 * )
 */
export function getFeatureByAttributes(
  layer: HTMLElement,
  attributes: {[string]: string},
) {
  const query = Object.keys(attributes).reduce((q, attributeKey) => {
    const partialQuery = `[data-${attributeKey}="${attributes[attributeKey]}"]`;
    return q + partialQuery;
  }, '');
  return layer.querySelector(query);
}

/**
 * The mapbox-gl mock converts all props into data- attributes and JSON
 * stringifies all objects. This retrieves the data attribute by prop name and
 * parses the attribute via JSON. For example:
 *
 * if rendering:
 * <Feature properties={{linkColor:'#ff0000'}} />
 *
 * const properties = getPropValue(feature, 'properties')
 * console.log(properties.linkColor) // #ff0000
 */
export function getPropValue(node: HTMLElement, propName: string) {
  const attr = node.getAttribute(`data-${propName.toLowerCase()}`);
  if (!attr) {
    return null;
  }
  return JSON.parse(attr);
}

export function getSourceFeatureCollection(
  container: HTMLElement,
  sourceId: string,
): GeoFeatureCollection {
  const source = getSourceById(container, sourceId);
  if (!source) {
    throw new Error(`No geojson source found with id: ${sourceId}`);
  }
  const geoJsonSource = getPropValue(source, 'geoJsonSource');
  if (!geoJsonSource) {
    throw new Error(`no data returned from geoJsonSource`);
  }
  const data = geoJsonSource.data;
  return data;
}

/**
 * Copied from mapbox-gl-draw's test utils
 * https://github.com/mapbox/mapbox-gl-draw/blob/main/test/utils/create_map.js
 * Creates an instance of the mapbox-gl-mock Map and customizes it to work with
 * mapbox-gl-draw.
 */
export function createMapboxDrawMap(
  mapOptions: {container: ?HTMLElement} = {},
) {
  const {interactions} = require('@mapbox/mapbox-gl-draw/src/constants');
  const map = new MapboxGlMock.Map(
    Object.assign(
      {
        container: document.createElement('div'),
        style: 'mapbox://styles/mapbox/streets-v8',
        accessToken: '',
      },
      mapOptions,
    ),
  );
  // Some mock project/unproject functions
  map.project = ([y, x]) => ({x, y});
  map.unproject = ([x, y]) => ({lng: y, lat: x});
  if (mapOptions.container) {
    map.getContainer = () => mapOptions.container;
  }

  // Mock up the interaction functions
  interactions.forEach(interaction => {
    map[interaction] = {
      enabled: true,
      disable() {
        this.enabled = false;
      },
      enable() {
        this.enabled = true;
      },
      isEnabled() {
        return this.enabled;
      },
    };
  });

  map.getCanvas = function () {
    return map.getContainer();
  };

  let classList = [];
  const container = map.getContainer();
  container.classList.add = function (names) {
    names = names || '';
    names.split(' ').forEach(name => {
      if (classList.indexOf(name) === -1) {
        classList.push(name);
      }
    });
    container.className = classList.join(' ');
  };

  container.classList.remove = function (names) {
    names = names || '';
    names.split(' ').forEach(name => {
      classList = classList.filter(n => n !== name);
    });
    container.className = classList.join(' ');
  };

  container.className = classList.join(' ');

  container.getBoundingClientRect = function () {
    return {
      left: 0,
      top: 0,
    };
  };

  map.getContainer = function () {
    return container;
  };

  return map;
}
