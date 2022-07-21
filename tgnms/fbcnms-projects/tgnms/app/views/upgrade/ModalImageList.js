/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local strict-local
 * @format
 */

import * as React from 'react';
import List from '@material-ui/core/List';
import ModalImageRow from './ModalImageRow';
import Typography from '@material-ui/core/Typography';
import type {SoftwareImageType} from '@fbcnms/tg-nms/app/helpers/UpgradeHelpers';

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
