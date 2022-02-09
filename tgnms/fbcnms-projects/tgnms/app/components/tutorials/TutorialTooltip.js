/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CloseIcon from '@material-ui/icons/Close';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import React from 'react';
import {TooltipRenderProps} from 'react-joyride';
import {makeStyles} from '@material-ui/styles';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';

const useStyles = makeStyles(theme => ({
  root: {
    borderRadius: 5,
    boxSizing: 'border-box',
    fontSize: theme.spacing(2),
    lineHeight: `${theme.spacing(2.5)}px`,
    padding: theme.spacing(2),
    position: 'relative',
    arrowColor: '#fff',
    backgroundColor: '#fff',
    zIndex: 100,
    width: 500,
  },

  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  error: {
    color: '#FF4614',
  },
  image: {
    margin: `-${theme.spacing(2)}px 0 ${theme.spacing(2)}px -${theme.spacing(
      2,
    )}px`,
  },
  title: {
    fontSize: theme.spacing(2.5),
    fontWeight: 500,
  },
  errorMessage: {
    marginTop: theme.spacing(0.5),
  },
  stepCount: {
    textAlign: 'center',
  },
  nextButton: {
    float: 'right',
  },
  backButton: {
    marginLeft: `-${theme.spacing(1.5)}px`,
  },
  footer: {
    padding: `${theme.spacing()}px 0 0 0 !important`,
  },
}));

export default function TutorialTooltip({
  primaryProps,
  tooltipProps,
  index,
  size,
  step,
  closeProps,
}: TooltipRenderProps) {
  const classes = useStyles();
  const {showError, prevStep, nextStep} = useTutorialContext();

  return (
    <Grid container spacing={2} className={classes.root} {...tooltipProps}>
      <IconButton className={classes.closeButton} {...closeProps}>
        <CloseIcon fontSize="small" />
      </IconButton>
      {step.image && (
        <img className={classes.image} src={step.image} alt="Image" />
      )}
      {step.title && (
        <Grid item container spacing={1} className={classes.title}>
          {step.title}
        </Grid>
      )}
      {step.content && (
        <Grid item container spacing={1}>
          {step.content}
        </Grid>
      )}
      {showError && step.error && (
        <Grid item container spacing={2} className={classes.error}>
          <Grid item>
            <ErrorOutlineIcon />
          </Grid>
          <Grid item className={classes.errorMessage}>
            {step.error}
          </Grid>
        </Grid>
      )}
      <Grid
        item
        container
        justifyContent="center"
        alignItems="center"
        className={classes.footer}>
        {index > 0 ? (
          <>
            <Grid item xs={3}>
              <Button
                color="primary"
                className={classes.backButton}
                onClick={prevStep}>
                back
              </Button>
            </Grid>
            <Grid item xs={5} className={classes.stepCount}>
              {`${index} of ${size - 1}`}
            </Grid>
          </>
        ) : (
          <div />
        )}
        <Grid item xs={index > 0 ? 4 : 12}>
          <Button
            className={classes.nextButton}
            variant="contained"
            color="primary"
            onClick={nextStep}>
            {primaryProps.title && primaryProps.title !== 'Last'
              ? primaryProps.title
              : 'Next'}
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
}
