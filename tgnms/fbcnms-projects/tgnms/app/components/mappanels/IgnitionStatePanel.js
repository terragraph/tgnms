/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {apiServiceRequestWithConfirmation} from '../../apiutils/ServiceAPIUtil';
import Chip from '@material-ui/core/Chip';
import CircularProgress from '@material-ui/core/CircularProgress';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import MenuItem from '@material-ui/core/MenuItem';
import PropTypes from 'prop-types';
import React from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  sectionSpacer: {
    height: theme.spacing.unit,
  },
  centered: {
    textAlign: 'center',
  },
  chip: {
    marginBottom: 4,
    marginRight: 4,

    // Override fixed height of 32px...
    height: 'auto',
    minHeight: 32,
  },
  chipLabel: {
    whiteSpace: 'normal',
  },
});

class IgnitionStatePanel extends React.Component {
  state = {};

  onChangeNetworkIgnitionState(enable) {
    // Set the automatic ignition state for the network
    const {networkName, refreshNetworkConfig} = this.props;

    const data = {enable};
    apiServiceRequestWithConfirmation(networkName, 'setIgnitionState', data, {
      desc: `This will <span style="color: ${enable ? 'green' : 'red'}">${
        enable ? 'enable' : 'disable'
      }</span> automatic ignition across the network.`,
      descType: 'html',
      onSuccess: refreshNetworkConfig,
    });
  }

  onEnableLinkIgnition(linkName) {
    // Turn automatic ignition for the given link on
    const {networkName, refreshNetworkConfig} = this.props;

    const data = {linkAutoIgnite: {[linkName]: true}};
    apiServiceRequestWithConfirmation(networkName, 'setIgnitionState', data, {
      desc: `This will turn on automatic ignition of <strong>${linkName}</strong>.`,
      descType: 'html',
      onSuccess: refreshNetworkConfig,
    });
  }

  renderIgnitionState(igParams) {
    // Render ignition state
    const {classes} = this.props;
    const ignitionEnabled = igParams.enable;
    const linkIgnitionOff = Object.keys(igParams.linkAutoIgnite).filter(
      linkName => igParams.linkAutoIgnite[linkName] === false,
    );

    return (
      <>
        <Typography variant="subtitle2">Network Ignition</Typography>
        <TextField
          select
          margin="dense"
          fullWidth
          onChange={ev => this.onChangeNetworkIgnitionState(ev.target.value)}
          value={ignitionEnabled}>
          <MenuItem key="enabled" value={true}>
            Enabled
          </MenuItem>
          <MenuItem key="disabled" value={false}>
            Disabled
          </MenuItem>
        </TextField>

        {linkIgnitionOff.length > 0 ? (
          <>
            <div className={classes.sectionSpacer} />

            <Typography variant="subtitle2" gutterBottom>
              Links with Ignition Disabled
            </Typography>
            <div>
              {linkIgnitionOff.map(linkName => (
                <Chip
                  key={linkName}
                  label={linkName}
                  classes={{root: classes.chip, label: classes.chipLabel}}
                  variant="outlined"
                  onDelete={() => this.onEnableLinkIgnition(linkName)}
                />
              ))}
            </div>
          </>
        ) : null}
      </>
    );
  }

  renderLoading() {
    // Render loading spinner
    const {classes} = this.props;
    return (
      <div className={classes.centered}>
        <CircularProgress />
      </div>
    );
  }

  renderPanel() {
    const {ignitionState} = this.props;
    if (!ignitionState || !ignitionState.igParams) {
      return <div style={{width: '100%'}}>{this.renderLoading()}</div>;
    }

    return (
      <div style={{width: '100%'}}>
        {this.renderIgnitionState(ignitionState.igParams)}
      </div>
    );
  }

  render() {
    const {expanded, onPanelChange, onClose} = this.props;

    return (
      <CustomExpansionPanel
        title="Ignition State"
        details={this.renderPanel()}
        expanded={expanded}
        onChange={onPanelChange}
        onClose={onClose}
      />
    );
  }
}

IgnitionStatePanel.propTypes = {
  classes: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
  onPanelChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  networkName: PropTypes.string.isRequired,
  ignitionState: PropTypes.object,
  refreshNetworkConfig: PropTypes.func.isRequired,
};

export default withStyles(styles)(IgnitionStatePanel);
