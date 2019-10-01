/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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

export const Feature = jest.fn(_props => {
  return null;
});

export const Layer = jest.fn(_props => {
  return null;
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
