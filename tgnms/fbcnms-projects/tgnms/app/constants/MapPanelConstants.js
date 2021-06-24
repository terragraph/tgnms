/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
