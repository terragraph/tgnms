/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import ClipboardTooltip from './ClipboardTooltip';
import CloseIcon from '@material-ui/icons/Close';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import LinearProgress from '@material-ui/core/LinearProgress';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import {withForwardRef} from '@fbcnms/ui/components/ForwardRef';
import type {ForwardRef} from '@fbcnms/ui/components/ForwardRef';

const useStyles = makeStyles(theme => ({
  root: {
    margin: `${theme.spacing(0.5)}px 0 `,
  },
  expanded: {
    '&$expanded': {
      margin: `${theme.spacing(0.5)}px 0 `,
      '&:first-child': {
        marginTop: `${theme.spacing(0.5)}px`,
      },
    },
  },
  panelHeading: {
    fontSize: theme.typography.pxToRem(15),
    lineHeight: '1rem',
    color: '#303846',
    display: 'flex',
    flexGrow: 1,
    flexBasis: '33.33%',
    flexShrink: 0,
    alignItems: 'center',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  },
  panelSummary: {
    minHeight: theme.spacing(3),
    paddingLeft: theme.spacing(3),
  },
  panelDetails: {
    padding: `0 ${theme.spacing(3)}px ${theme.spacing(3)}px`,
  },
  panelIconButton: {
    padding: '6px',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  panelIcon: {
    fontSize: theme.typography.pxToRem(18),
    color: theme.palette.grey[500],
    height: '100%',
  },
  closeIconButton: {
    transition: 'none',
  },
  progress: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',

    // Fade out
    opacity: 1,
    animation: 'fadeout 0.15s ease-out forwards',
    animationDelay: '1.2s',
  },
  progressBar: {
    // Only play once
    animationIterationCount: 1,
    animationDuration: '2.1s',
    animationDelay: '0.3s',
  },
  hidden: {
    display: 'none',
  },
  '@keyframes fadeout': {
    '0%': {
      opacity: 1,
    },
    '100%': {
      opacity: 0,
    },
  },
}));

export type Props = {
  className?: string,
  title?: string,
  details: React.Node,
  expanded: boolean,
  titleIcon?: React.Node,
  onChange?: () => any,
  onClose?: () => any,
  onPin?: () => any,
  pinned?: boolean,
  showLoadingBar?: boolean,
  showTitleCopyTooltip?: boolean,
  'data-testid'?: string,
} & ForwardRef;

export default withForwardRef(function CustomAccordion(props: Props) {
  const {
    className,
    details,
    expanded,
    onChange,
    onClose,
    onPin,
    pinned,
    showLoadingBar,
    showTitleCopyTooltip,
    title = '',
    titleIcon,
  } = props;
  const classes = useStyles();
  const testId = props['data-testid'];

  const isClosable = !!onClose;
  // A 'close' button can take the place of the chevron
  const closeButtonProps = {
    /**
     * The CloseIcon looks large compared to the normal chevron. fontSize
     * small shrinks it. edge=false because the underlying
     * component uses margins instead of a flex grid.
     */
    expandIcon: <CloseIcon fontSize="small" />,
    IconButtonProps: {
      edge: false,
      size: 'small',
      'aria-label': 'Close',
      onClick: event => {
        event.stopPropagation();
        if (typeof onClose === 'function') {
          onClose();
        }
      },
    },
  };
  // A 'pin' button can be rendered to the left of the 'expand'/'close' button
  const pinButton = onPin ? (
    <IconButton
      aria-label="Pin"
      classes={{root: classes.panelIconButton}}
      onClick={event => {
        event.stopPropagation();
        onPin();
      }}
      title={pinned ? 'Unpin from network drawer' : 'Pin to network drawer'}>
      {pinned ? (
        <LockIcon classes={{root: classes.panelIcon}} />
      ) : (
        <LockOpenIcon classes={{root: classes.panelIcon}} />
      )}
    </IconButton>
  ) : null;

  // A fake 'progress bar' can be added on the top border for emphasis
  const loadingBar = showLoadingBar ? (
    <LinearProgress
      classes={{
        root: classes.progress,
        bar1Indeterminate: classes.hidden,
        bar2Indeterminate: classes.progressBar,
      }}
    />
  ) : null;

  return (
    <Paper elevation={2} square={true}>
      <Accordion
        classes={{
          root: `${className ? className : classes.root}`,
          expanded: classes.expanded,
        }}
        square={true}
        expanded={expanded}
        onChange={onChange}
        ref={props.fwdRef}
        data-testid={testId}
        data-test-expanded={expanded}>
        <AccordionSummary
          classes={{
            root: classes.panelSummary,
            expandIcon: isClosable ? classes.closeIconButton : undefined,
          }}
          expandIcon={<ExpandMoreIcon />}
          {...(isClosable ? closeButtonProps : {})}>
          {loadingBar}
          <Grid container justifyContent="space-between">
            <ClipboardTooltip
              title={title}
              enabled={showTitleCopyTooltip === true}>
              <Typography className={classes.panelHeading} variant="h6">
                {titleIcon || null}
                {title}
              </Typography>
            </ClipboardTooltip>
            {pinButton}
          </Grid>
        </AccordionSummary>
        <AccordionDetails className={classes.panelDetails}>
          {details}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
});
