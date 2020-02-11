/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import AddIcon from '@material-ui/icons/Add';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import React from 'react';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import TextField from '@material-ui/core/TextField';
import {withStyles} from '@material-ui/core/styles';

import type {ApiRequestAttemptsType} from './AddNodePanel';
import type {NetworkConfig} from '../../contexts/NetworkContext';
import type {Theme, WithStyles} from '@material-ui/core';

type RadioMacChangesType = {
  newChange: string,
  deleteChange: string,
  editChange: {oldMac: string, newMac: string},
};

const NEW_ADDR = 'new';
const DELETED_ADDR = 'deleted';

const styles = (theme: Theme) => ({
  emptyText: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontSize: theme.typography.pxToRem(12),
  },
  buttonSize: {
    padding: theme.spacing(1),
    fontSize: theme.typography.pxToRem(12),
  },
  iconSize: {
    fontSize: theme.typography.pxToRem(18),
  },
  buttonText: {
    paddingLeft: theme.spacing(1),
    paddingTop: theme.spacing(0.25),
  },
});

type Props = {
  label: string,
  macAddr: string,
  required: boolean,
  radioMacs: ?string,
  networkConfig?: ?NetworkConfig,
  networkName: string,
  name: string,
  onRadioMacChange: (Array<ApiRequestAttemptsType>) => any,
  submitButtonStatus: boolean => any,
} & WithStyles<typeof styles>;

type State = {
  showError: boolean,
  radioMacs: {[string]: string},
};

class EditRadioMacs extends React.Component<Props, State> {
  state = {
    showError: false,
    radioMacs: this.formatInitialWlanMacAddr(),
  };

  onChange(newRadioMacs) {
    const error = this.errorCheck(newRadioMacs);
    if (!error) {
      this.setState({showError: false});
    }
    if (this.state.showError) {
      this.checkSubmitButtonStatus(newRadioMacs);
    }
    if (this.radioMacsChanged(newRadioMacs)) {
      this.props.onRadioMacChange(this.processRadioMacsSubmit(newRadioMacs));
    }
    this.setState({radioMacs: newRadioMacs});
  }

  checkSubmitButtonStatus(radioMacs) {
    if (radioMacs === undefined) {
      radioMacs = this.state.radioMacs;
    }
    const error = this.errorCheck(radioMacs);
    this.props.submitButtonStatus(error);
  }

  // checks if any radio MAC changed
  radioMacsChanged(radioMacs) {
    const changes = Object.keys(radioMacs).map(key =>
      this.radioMacChanged(key, radioMacs),
    );
    return changes.some(change => Object.keys(change).length > 0);
  }

  // check if a single radio MAC changed
  radioMacChanged(key, radioMacs) {
    const changes: RadioMacChangesType = {};
    if (radioMacs[key] === '') {
      return changes;
    }
    if (key.includes(NEW_ADDR)) {
      changes.newChange = radioMacs[key];
    } else if (this.checkIfDeleted(radioMacs[key])) {
      changes.deleteChange = key;
    } else if (radioMacs[key] !== key) {
      changes.editChange = {oldMac: key, newMac: radioMacs[key]};
    }
    return changes;
  }

  // sets up the api calls for radio MAC changes
  processRadioMacsSubmit(radioMacs) {
    const {networkName, name} = this.props;
    const apiRequestAttempts: Array<ApiRequestAttemptsType> = [];

    Object.keys(radioMacs).map(key => {
      const {editChange, newChange, deleteChange} = this.radioMacChanged(
        key,
        radioMacs,
      );
      if (editChange) {
        const data = {
          nodeName: name,
          oldWlanMac: editChange.oldMac,
          newWlanMac: editChange.newMac,
          force: true,
        };
        apiRequestAttempts.push({
          networkName: networkName,
          apiMethod: 'changeNodeWlanMacAddress',
          data: data,
        });
      } else if (newChange) {
        const data = {
          nodeName: name,
          wlanMacs: [newChange],
        };
        apiRequestAttempts.push({
          networkName: networkName,
          apiMethod: 'addNodeWlanMacAddresses',
          data: data,
        });
      } else if (deleteChange) {
        const data = {
          nodeName: name,
          wlanMacs: [deleteChange],
          force: true,
        };
        apiRequestAttempts.push({
          networkName: networkName,
          apiMethod: 'deleteNodeWlanMacAddresses',
          data: data,
        });
      }
    });
    return apiRequestAttempts;
  }

  formatInitialWlanMacAddr() {
    return this.props.radioMacs
      ? this.props.radioMacs
          .split(',')
          .map(mac => mac.trim())
          .reduce((obj, mac) => {
            obj[mac] = mac;
            return obj;
          }, {})
      : {};
  }

  addRadioMac() {
    const {radioMacs} = this.state;
    const tempRadioMacs = Object.assign({}, radioMacs);
    tempRadioMacs[NEW_ADDR + Object.keys(radioMacs).length] = '';
    this.onChange(tempRadioMacs);
  }

  deleteRadioMac(key: string) {
    const {radioMacs} = this.state;
    const tempRadioMacs = Object.assign({}, radioMacs);
    if (key.includes(NEW_ADDR)) {
      delete tempRadioMacs[key];
    } else {
      tempRadioMacs[key] = DELETED_ADDR;
    }
    this.onChange(tempRadioMacs);
  }

  checkIfDeleted(radioMac) {
    return radioMac === DELETED_ADDR;
  }

  getNodeWithRadioMac(key: string) {
    const {networkConfig, name} = this.props;
    const {radioMacs} = this.state;
    const radioMacValues = Object.values(radioMacs);
    if (
      radioMacValues.some(
        radioMac =>
          radioMac !== '' &&
          radioMac === radioMacs[key] &&
          radioMacValues.indexOf(
            radioMacs[key],
            radioMacValues.indexOf(radioMacs[key]) + 1,
          ) !== -1,
      )
    ) {
      return name;
    }

    const nodeWithRadioMac = networkConfig
      ? networkConfig.topology.nodes.filter(
          node =>
            node.name !== name &&
            node.wlan_mac_addrs.some(macAddr => macAddr === radioMacs[key]),
        )
      : null;
    return nodeWithRadioMac && nodeWithRadioMac.length === 1
      ? nodeWithRadioMac[0].name
      : null;
  }

  inputChange(ev, key: string) {
    const {radioMacs} = this.state;
    const tempRadioMacs = Object.assign({}, radioMacs);
    tempRadioMacs[key] = ev.target.value;
    this.onChange(tempRadioMacs);
  }

  errorCheck(radioMacs: {[string]: string}) {
    return Object.keys(radioMacs).some(key =>
      this.radioMacError(key, radioMacs),
    );
  }

  radioMacError(key: string, radioMacs?: {[string]: string}) {
    if (radioMacs === null || radioMacs === undefined) {
      radioMacs = this.state.radioMacs;
    }

    const nodeWithRadioMac = this.getNodeWithRadioMac(key);
    if (this.checkIfDeleted(radioMacs[key])) {
      return null;
    } else if (radioMacs[key].length !== 17 && radioMacs[key].length !== 0) {
      return 'Must follow MAC address format FF:FF:FF:FF:FF:FF';
    } else if (nodeWithRadioMac !== null) {
      return 'This MAC address is already associated with ' + nodeWithRadioMac;
    } else {
      return null;
    }
  }

  showAddButton() {
    const {radioMacs} = this.state;
    const deletedMacs = Object.values(radioMacs).filter(value =>
      this.checkIfDeleted(value),
    );
    return Object.keys(radioMacs).length - deletedMacs.length < 4;
  }

  renderTextFields() {
    const {macAddr, networkConfig} = this.props;
    const {radioMacs} = this.state;

    const statusReport = networkConfig
      ? networkConfig.status_dump.statusReports[macAddr]
      : null;
    return Object.keys(radioMacs).map(key => {
      if (this.checkIfDeleted(radioMacs[key])) {
        return null;
      }
      const status =
        statusReport &&
        statusReport.radioStatus &&
        statusReport.radioStatus[radioMacs[key]]
          ? statusReport.radioStatus[radioMacs[key]].initialized
          : null;

      const errorMessage = this.state.showError
        ? this.radioMacError(key)
        : null;
      return {key, status, errorMessage};
    });
  }

  render() {
    const {classes, label, required} = this.props;
    const textFields = this.renderTextFields();
    return (
      <>
        {textFields.length !== 0 ? (
          textFields.map(radioMacDetails => {
            if (radioMacDetails === null) {
              return null;
            }
            const {key, status, errorMessage} = radioMacDetails;
            return (
              <TextField
                id={key}
                data-testid={key}
                key={key}
                label={label}
                InputLabelProps={{shrink: true}}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <StatusIndicator
                        color={
                          status === null
                            ? StatusIndicatorColor.GREY
                            : status
                            ? StatusIndicatorColor.GREEN
                            : StatusIndicatorColor.RED
                        }
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        data-testid={key + 'Delete'}
                        onClick={() => this.deleteRadioMac(key)}>
                        <DeleteIcon className={classes.iconSize} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                margin="dense"
                fullWidth
                required={required}
                onBlur={() => {
                  this.checkSubmitButtonStatus();
                  this.setState({showError: true});
                }}
                onChange={ev => this.inputChange(ev, key)}
                helperText={errorMessage ? errorMessage : null}
                error={errorMessage ? true : false}
                value={this.state.radioMacs[key]}
              />
            );
          })
        ) : (
          <span key="EmptyRadioText" className={classes.emptyText}>
            Radio MAC Address
          </span>
        )}
        {this.showAddButton() ? (
          <Button
            className={classes.buttonSize}
            key="radioMacNew"
            color="primary"
            size="small"
            onClick={() => this.addRadioMac()}>
            <AddIcon className={classes.iconSize} />
            <span className={classes.buttonText}>ADD RADIO MAC ADDRESS</span>
          </Button>
        ) : null}
      </>
    );
  }
}

export default withStyles(styles)(EditRadioMacs);
