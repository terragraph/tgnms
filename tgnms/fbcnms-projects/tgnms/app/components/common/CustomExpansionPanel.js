/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
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
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';
import type {ForwardRef} from '@fbcnms/ui/components/ForwardRef';

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
    minHeight: theme.spacing(3) + 'px !important',
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
    position: 'absolute',
    top: '50%',
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
    paddingRight: theme.spacing(3),
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

export type Props = {
  classes: {[string]: string},
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
} & ForwardRef;

class CustomExpansionPanel extends React.Component<Props> {
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
          classes: {expandIcon: classes.closeIconButton, root: ''},
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
      <ExpansionPanel
        classes={className ? {root: className} : {}}
        expanded={expanded}
        onChange={onChange}
        ref={this.props.fwdRef}>
        <ExpansionPanelSummary
          classes={{root: classes.panelSummary}}
          {...closeButtonProps}>
          {loadingBar}
          <div className={classes.spaceBetween}>
            <ExpansionPanelSummaryTooltip
              title={title}
              enabled={showTitleCopyTooltip === true}>
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

type SummaryProps = {
  title: string,
  children: React.Element<any>,
  enabled: boolean,
  classes: {[string]: string},
};

type SummaryState = {
  copySuccessful: boolean,
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
  class ExpansionPanelSummaryTooltip extends React.Component<
    SummaryProps,
    SummaryState,
  > {
    selectionRef = React.createRef<HTMLTextAreaElement>();

    state = {
      copySuccessful: false,
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
          onClose={() => this.setState({copySuccessful: false})}
          placement="top-start">
          {children}
        </Tooltip>
      );
    }

    handleCopyButtonClick = e => {
      e.stopPropagation();
      if (this.selectionRef.current) {
        this.selectionRef.current.select();
        this.setState({copySuccessful: document.execCommand('copy')});
      }
    };
  },
);

export default withStyles(styles, {withTheme: true})(CustomExpansionPanel);
