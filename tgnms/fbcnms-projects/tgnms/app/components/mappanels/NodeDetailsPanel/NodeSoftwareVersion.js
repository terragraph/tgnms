/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import {shortenVersionString} from '../../../helpers/VersionHelper';

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
