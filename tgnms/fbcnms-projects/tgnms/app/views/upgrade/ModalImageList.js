/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow strict-local
 * @format
 */

import List from '@material-ui/core/List';
import ModalImageRow from './ModalImageRow';
import React from 'react';
import Typography from '@material-ui/core/Typography';

import type {SoftwareImageType} from './ModalUpgradeImages';

export type ChecksumType = 'MD5' | 'SHA1';

type Props = {|
  upgradeImages: Array<SoftwareImageType>,
  checksumType: ChecksumType,
  onClick: (HTMLAnchorElement, SoftwareImageType) => void,
|};

const ModalImageList = (props: Props) => {
  const {upgradeImages, checksumType} = props;
  return (
    <List>
      {upgradeImages.length > 0 ? (
        upgradeImages.map(upgradeImage => (
          <ModalImageRow
            key={upgradeImage.md5}
            image={upgradeImage}
            checksumType={checksumType}
            onClick={props.onClick}
          />
        ))
      ) : (
        <Typography variant="subtitle1">No Images Available</Typography>
      )}
    </List>
  );
};

export default ModalImageList;
