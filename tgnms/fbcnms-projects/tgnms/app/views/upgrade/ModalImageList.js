/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow strict-local
 * @format
 */

'use strict';

import List from '@material-ui/core/List';
import ModalImageRow from './ModalImageRow';
import React from 'react';

import type {UpgradeImageType} from '../../../shared/types/Controller';

type Props = {|
  upgradeImages: Array<UpgradeImageType>,
  onClick: (HTMLAnchorElement, UpgradeImageType) => void,
|};

const ModalImageList = (props: Props) => {
  const {upgradeImages} = props;
  return (
    <List>
      {upgradeImages.map(upgradeImage => (
        <ModalImageRow
          key={upgradeImage.md5}
          image={upgradeImage}
          onClick={props.onClick}
        />
      ))}
    </List>
  );
};

export default ModalImageList;
