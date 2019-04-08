/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import CloseIcon from '@material-ui/icons/Close';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import IconButton from '@material-ui/core/IconButton';
import LinearProgress from '@material-ui/core/LinearProgress';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import PropTypes from 'prop-types';
import React from 'react';
import {withStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';

const styles = theme => ({
  panelHeading: {
    fontSize: theme.typography.pxToRem(15),
    lineHeight: '1rem',
    color: theme.palette.grey[500],
    display: 'flex',
    flexGrow: 1,
    flexBasis: '33.33%',
    flexShrink: 0,
    alignItems: 'center',
  },
  panelSummary: {
    minHeight: theme.spacing.unit * 3 + 'px !important',
  },
  panelDetails: {
    padding: '0 24px 24px',
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
    padding: '6px',
    right: 18,

    // Disable rotation
    transform: 'translateY(-50%) !important',
    transition: 'none',
  },
  closeIcon: {
    fontSize: theme.typography.pxToRem(20),
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
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
});

class CustomExpansionPanel extends React.Component {
  render() {
    const {
      classes,
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
    } = this.props;

    // A 'close' button can take the place of the chevron
    const closeButtonProps = onClose
      ? {
          classes: {expandIcon: classes.closeIconButton},
          expandIcon: <CloseIcon classes={{root: classes.closeIcon}} />,
          IconButtonProps: {
            'aria-label': 'Close',
            onClick: event => {
              event.stopPropagation();
              onClose();
            },
          },
        }
      : {
          expandIcon: <ExpandMoreIcon />,
        };

    // A 'pin' button can be rendered to the left of the 'expand'/'close' button
    const pinButton = onPin ? (
      <IconButton
        aria-label="Pin"
        classes={{root: classes.panelIconButton}}
        onClick={event => {
          event.stopPropagation();
          onPin();
        }}>
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
      <ExpansionPanel
        classes={className ? {root: className} : {}}
        expanded={expanded}
        onChange={onChange}>
        <ExpansionPanelSummary
          classes={{root: classes.panelSummary}}
          {...closeButtonProps}>
          {loadingBar}
          <div className={classes.spaceBetween}>
            <ExpansionPanelSummaryTooltip
              title={title}
              enabled={showTitleCopyTooltip}>
              <Typography className={classes.panelHeading} variant="h6">
                {titleIcon || null}
                {title}
              </Typography>
            </ExpansionPanelSummaryTooltip>
            {pinButton}
          </div>
        </ExpansionPanelSummary>
        <ExpansionPanelDetails className={classes.panelDetails}>
          {details}
        </ExpansionPanelDetails>
      </ExpansionPanel>
    );
  }
}

CustomExpansionPanel.propTypes = {
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  title: PropTypes.string,
  details: PropTypes.node.isRequired,
  expanded: PropTypes.bool.isRequired,
  titleIcon: PropTypes.node,
  onChange: PropTypes.func,
  onClose: PropTypes.func,
  onPin: PropTypes.func,
  pinned: PropTypes.bool,
  showLoadingBar: PropTypes.bool,
  showTitleCopyTooltip: PropTypes.bool,
};

const ExpansionPanelSummaryTooltip = withStyles({
  copyButton: {
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  hiddenTextArea: {
    position: 'absolute',
    left: '-9999px',
    height: 0,
    width: 0,
  },
})(
  class ExpansionPanelSummaryTooltip extends React.Component {
    selectionRef = React.createRef();

    state = {
      copySuccessful: false,
    };

    static propTypes = {
      title: PropTypes.string.isRequired,
      children: PropTypes.node.isRequired,
      enabled: PropTypes.bool,
    };

    render() {
      const {title, children, enabled, classes} = this.props;
      if (!enabled) {
        return children;
      }
      return (
        <Tooltip
          title={
            <React.Fragment>
              <span>{title}</span>
              <span> - </span>
              <a
                className={classes.copyButton}
                onClick={this.handleCopyButtonClick}
                role="button">
                {this.state.copySuccessful ? 'Copied!' : 'Click to copy'}
                <textarea
                  className={classes.hiddenTextArea}
                  aria-hidden="true"
                  ref={this.selectionRef}
                  value={title}
                  readOnly
                />
              </a>
            </React.Fragment>
          }
          enterDelay={500}
          leaveDelay={this.state.copySuccessful ? 200 : 1000}
          interactive
          onClose={() => this.setState({copySuccessful: false})}>
          {children}
        </Tooltip>
      );
    }

    handleCopyButtonClick = e => {
      e.stopPropagation();
      this.selectionRef.current.select();
      this.setState({copySuccessful: document.execCommand('copy')});
    };
  },
);

export default withStyles(styles, {withTheme: true})(CustomExpansionPanel);
