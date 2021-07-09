/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  root: {
    marginLeft: `-${theme.spacing(3)}px !important`,
    marginRight: `-${theme.spacing(5)}px !important`,
    background: '#F7F6F6',
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
      details={children}
    />
  );
}
