/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import {shortenVersionString} from '@fbcnms/tg-nms/app/helpers/VersionHelper';

const useStyles = makeStyles(theme => ({
  sectionHeading: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: theme.palette.grey[700],
    paddingTop: theme.spacing(1),
  },
}));

type Props = {
  version: string,
};

export default function NodeSoftwareVersion(props: Props) {
  const classes = useStyles();
  const {version} = props;

  return (
    <>
      <Typography variant="subtitle2" className={classes.sectionHeading}>
        Software Version
      </Typography>
      <Typography gutterBottom variant="body2">
        <em>{shortenVersionString(version)}</em>
      </Typography>
    </>
  );
}
