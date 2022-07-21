/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  root: {
    background: '#F7F6F6',
  },
  detailsWrapper: {
    marginTop: `-${theme.spacing(3)}px`,
    width: '100%',
  },
}));

export default function AssetElementWrapper({
  children,
  onClose,
}: {
  children: React.Node,
  onClose: () => void,
}) {
  const classes = useStyles();

  return (
    <CustomAccordion
      className={classes.root}
      expanded={true}
      onClose={onClose}
      details={<div className={classes.detailsWrapper}>{children}</div>}
    />
  );
}
