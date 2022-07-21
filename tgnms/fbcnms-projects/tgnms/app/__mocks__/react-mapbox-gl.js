/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */
import React from 'react';

if (!(window.CONFIG && window.CONFIG.env)) {
  window.CONFIG = {env: {MAPBOX_ACCESS_TOKEN: ''}};
}

function MapBoxGLMock(props) {
  return <span>{props.children}</span>;
}

export default function ReactMapboxGl(_config) {
  return MapBoxGLMock;
}

export const Source = jest.fn(({children, ...props}) => {
  const domAttributes = convertPropsToDomAttributes(props);
  return (
    <span data-mapbox-type="source" children={children} {...domAttributes} />
  );
});

export const Feature = jest.fn(({children, ...props}) => {
  const domAttributes = convertPropsToDomAttributes(props);
  return (
    <span data-mapbox-type="feature" children={children} {...domAttributes} />
  );
});

export const Layer = jest.fn(({children, ...props}) => {
  const domAttributes = convertPropsToDomAttributes(props);
  return (
    <span data-mapbox-type="layer" children={children} {...domAttributes} />
  );
});

export const ZoomControl = jest.fn(_props => {
  return null;
});

export const RotationControl = jest.fn(_props => {
  return null;
});

export const Popup = jest.fn(_props => {
  return null;
});

function convertPropsToDomAttributes(props) {
  /**
   * prefix all prop keys with data- so jsdom doesn't log
   * about invalid props
   */
  const attributes = Object.keys(props).reduce((map, key) => {
    const val = props[key];
    /**
     * if the prop is a function, pass it through since it
     * may be an event handler
     */
    if (typeof val === 'function') {
      map[key] = val;
      return map;
    }
    // JSON stringify objects since the dom attribute will be [object Object]
    map[`data-${key.toLowerCase()}`] =
      typeof val === 'object' ? JSON.stringify(val) : val;
    return map;
  }, {});
  return attributes;
}
