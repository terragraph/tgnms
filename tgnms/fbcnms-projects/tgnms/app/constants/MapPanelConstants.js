/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

export const SlideProps = {
  direction: 'left',
  mountOnEnter: true,
  // Don't set unmountOnExit if any action is taken on mount!
  // (interferes with onClosePanel() logic and causes unmount-mount-unmount)
};

export const FORM_TYPE = Object.freeze({
  CREATE: 'CREATE',
  EDIT: 'EDIT',
});

export const defaultLocation = {
  latitude: 0,
  longitude: 0,
  altitude: 0,
  accuracy: 40000000,
};
