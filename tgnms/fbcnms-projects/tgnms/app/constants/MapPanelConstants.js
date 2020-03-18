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

export const FormType = Object.freeze({
  CREATE: 'CREATE',
  EDIT: 'EDIT',
});

export const TopologyElement = {
  site: 'site',
  node: 'node',
  link: 'link',
};
