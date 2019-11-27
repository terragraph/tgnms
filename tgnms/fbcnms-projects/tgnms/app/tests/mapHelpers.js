/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

/**
 * Get the mapbox gl layer with the specified id
 */
export function getLayerById(container: HTMLElement, id: string): ?HTMLElement {
  return container.querySelector(`[data-mapbox-type="layer"][data-id="${id}"]`);
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
