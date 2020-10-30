/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import IconButton from '@material-ui/core/IconButton';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';

type Props = {
  startDate: Date,
  onBack?: () => void,
  title?: string,
};

const useStyles = makeStyles(theme => ({
  header: {
    textTransform: 'uppercase',
    margin: `${theme.spacing(1)}px 0 ${theme.spacing(1)}px ${-theme.spacing(
      1,
    )}px`,
    fontWeight: theme.typography.fontWeightMedium,
  },
}));

export default function ScanPanelTitle(props: Props) {
  const {startDate, onBack, title} = props;
  const classes = useStyles();

  return (
    <>
      {title && (
        <Typography className={classes.header} variant="subtitle1">
          {onBack ? (
            <IconButton
              size="small"
              data-testid="back-button"
              onClick={onBack}
              color="secondary">
              <ChevronLeftIcon />
            </IconButton>
          ) : null}
          {title}
        </Typography>
      )}
      <Typography variant="body1" gutterBottom>
        Results from{' '}
        {startDate.toLocaleString('default', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </Typography>
    </>
  );
}
