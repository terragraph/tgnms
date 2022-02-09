/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import Collapse from '@material-ui/core/Collapse';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  root: {
    padding: `${theme.spacing()}px ${theme.spacing(1.5)}px`,
  },
  title: {
    paddingTop: theme.spacing(0.25),
  },
  titleWrapper: {
    marginLeft: -theme.spacing(1),
    marginBottom: theme.spacing(),
  },
  resultDivider: {
    margin: `${theme.spacing()}px ${theme.spacing(-1.5)}px`,
  },
  sectionName: {
    marginBottom: theme.spacing(1 / 2),
  },
  label: {
    '&::first-letter': {
      textTransform: 'capitalize',
    },
  },
  rotateIcon: {
    transform: 'rotate(90deg)',
  },
  transition: {
    transition: 'all 0.3s',
  },
}));

export default function AssetDropDown({
  title,
  children,
  onPanelChange,
  expanded,
}: {
  title: React.Node,
  children: React.Node,
  expanded: boolean,
  onPanelChange: () => void,
}) {
  const classes = useStyles();

  return (
    <Grid container direction="column">
      <Grid
        item
        className={classes.titleWrapper}
        onClick={onPanelChange}
        container
        wrap="nowrap">
        <Grid item container xs={2} justifyContent="center">
          <Grid item>
            <IconButton
              size="small"
              onClick={onPanelChange}
              data-testid="drawer-toggle-button"
              edge="start">
              <ArrowRightIcon
                color="secondary"
                className={classNames(
                  expanded ? classes.rotateIcon : '',
                  classes.transition,
                )}
              />
            </IconButton>
          </Grid>
        </Grid>
        <Grid item>
          <Typography className={classes.title} variant="subtitle1">
            {title}
          </Typography>
        </Grid>
      </Grid>
      <Collapse
        in={expanded}
        component={Grid}
        container
        item
        direction="column"
        wrap="nowrap"
        justifyContent="flex-start"
        data-testid={expanded ? 'asset-expanded' : 'asset-collapsed'}>
        {children}
      </Collapse>
    </Grid>
  );
}
