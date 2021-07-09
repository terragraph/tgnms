/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import {MODULE_TITLES} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {makeStyles} from '@material-ui/styles';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';

const useStyles = makeStyles(() => ({
  clearedIcon: {color: '#00AF5B', marginTop: '-2px'},
  todoIcon: {color: '#e0e0e0', marginTop: '-2px'},
  root: {paddingTop: '16px'},
}));

export default function TutorialProgressContent({
  progress,
  subTitle,
}: {
  progress: number,
  subTitle?: string,
}) {
  const classes = useStyles();

  return (
    <Grid container>
      <Grid item>{subTitle}</Grid>
      <Grid
        item
        container
        className={classes.root}
        spacing={1}
        direction="column">
        {objectValuesTypesafe<string>(MODULE_TITLES).map(
          (moduleName, index) => (
            <Grid item container spacing={1}>
              <Grid item>{index + 1}.</Grid>
              <Grid item>
                <CheckCircleIcon
                  className={
                    index < progress ? classes.clearedIcon : classes.todoIcon
                  }
                />
              </Grid>
              <Grid item>{moduleName}</Grid>
            </Grid>
          ),
        )}
      </Grid>
    </Grid>
  );
}
