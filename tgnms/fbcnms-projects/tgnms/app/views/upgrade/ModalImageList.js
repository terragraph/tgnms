/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow strict-local
 * @format
 */

import * as React from 'react';
import List from '@material-ui/core/List';
import ModalImageRow from './ModalImageRow';
import Typography from '@material-ui/core/Typography';
import type {SoftwareImageType} from '../../helpers/UpgradeHelpers';

type Props = {|
  upgradeImages: Array<$Shape<SoftwareImageType>>,
  menuItems: Array<React.Node>,
|};

const ModalImageList = (props: Props) => {
  const {upgradeImages} = props;
  return (
    <List>
      {upgradeImages.length > 0 ? (
        upgradeImages.map(upgradeImage => (
          <ModalImageRow
            key={
              (upgradeImage.versionNumber || '') +
              (upgradeImage.fileName || '') +
              upgradeImage.md5
            }
            image={upgradeImage}
            menuItems={props.menuItems}
          />
        ))
      ) : (
        <Typography variant="subtitle1">No Images Available</Typography>
      )}
    </List>
  );
};

export default ModalImageList;
