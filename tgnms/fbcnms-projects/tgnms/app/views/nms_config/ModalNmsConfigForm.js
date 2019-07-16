/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import Button from '@material-ui/core/Button';
import MaterialModal from '../../components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkListContext from '../../NetworkListContext';
import PropTypes from 'prop-types';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import isIp from 'is-ip';
import {
  createNumericInput,
  createSelectInput,
  createTextInput,
  formParseInt,
} from '../../helpers/FormHelpers';
import {toTitleCase} from '../../helpers/StringHelpers';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  button: {
    margin: theme.spacing.unit,
  },
  modalContent: {
    paddingBottom: theme.spacing.unit,
  },
  formHeading: {
    fontSize: '1.05rem',
    paddingTop: 12,
  },
  red: {
    color: 'red',
  },
});

const FormType = Object.freeze({
  CREATE: 'CREATE',
  EDIT: 'EDIT',
});

const DEFAULT_CONTROLLER_CONFIG = Object.freeze({
  api_port: 8080,
  e2e_port: 17077,
  api_ip: '',
  e2e_ip: '',
});

// TODO - define this elsewhere?
const WAC_TYPES = Object.freeze({
  none: 'none',
  ruckus: 'ruckus',
});

class ModalNmsConfigForm extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    // Copy initial values from networkConfig since we allow editing values
    this.state = this.getState(props);
  }

  getState(props) {
    // Compute the form state based on the given props
    let {networkConfig} = props;
    if (networkConfig === undefined) {
      networkConfig = {};
    }
    if (!networkConfig.hasOwnProperty('primary')) {
      networkConfig.primary = DEFAULT_CONTROLLER_CONFIG;
    }
    if (!networkConfig.hasOwnProperty('backup')) {
      networkConfig.backup = DEFAULT_CONTROLLER_CONFIG;
    }
    return {
      network: networkConfig.name || '',
      primaryApiIp: networkConfig.primary.api_ip,
      primaryE2eIp: networkConfig.primary.e2e_ip || '',
      primaryApiPort: networkConfig.primary.api_port,
      primaryE2ePort: networkConfig.primary.e2e_port,
      backupApiIp: networkConfig.backup.api_ip,
      backupE2eIp: networkConfig.backup.e2e_ip || '',
      backupApiPort: networkConfig.backup.api_port,
      backupE2ePort: networkConfig.backup.e2e_port,
      wacType: networkConfig.wireless_controller?.type || WAC_TYPES.none,
      wacUrl: networkConfig.wireless_controller?.url || '',
      wacUsername: networkConfig.wireless_controller?.username || '',
      wacPassword: '' /* we don't pass this from the server */,

      formErrors: {},
    };
  }

  onEnter = () => {
    // Reset state with new props on enter
    const newState = this.getState(this.props);
    this.setState(newState);
  };

  validatePort(portNum) {
    // Verify that port number is valid
    return portNum >= 0 && portNum <= 65535;
  }

  handleSubmit = waitForNetworkListRefresh => {
    // Submit the form
    const {networkConfig, type, onClose, networkList} = this.props;
    const {
      network,
      primaryApiIp,
      primaryApiPort,
      primaryE2eIp,
      primaryE2ePort,
      backupApiIp,
      backupApiPort,
      backupE2eIp,
      backupE2ePort,
      wacType,
      wacUrl,
      wacUsername,
      wacPassword,
    } = this.state;

    // Validate form fields
    const errors = {};
    if (networkList.hasOwnProperty(network)) {
      if (type === FormType.CREATE || network !== networkConfig.name) {
        errors.network =
          'This network name is already taken. Please use a different name.';
      }
    }
    if (network.trim() === '') {
      errors.network = 'Please enter a name.';
    }
    if (!this.validatePort(primaryApiPort)) {
      errors.primaryApiPort = 'Please enter a valid port number.';
    }
    if (!this.validatePort(primaryE2ePort)) {
      errors.primaryE2ePort = 'Please enter a valid port number.';
    }
    if (!isIp(primaryApiIp)) {
      errors.primaryApiIp = 'Please enter a valid IP address.';
    }
    if (!isIp(primaryE2eIp)) {
      errors.primaryE2eIp = 'Please enter a valid IP address.';
    }
    if (backupApiIp !== '') {
      if (!this.validatePort(backupApiPort)) {
        errors.backupApiPort = 'Please enter a vaid port number.';
      }
      if (!this.validatePort(backupE2ePort)) {
        errors.backupE2ePort = 'Please enter a valid port number.';
      }
      if (!isIp(backupApiIp)) {
        errors.backupApiIp = 'Please enter a valid IP address.';
      }
      if (!isIp(backupE2eIp)) {
        errors.backupE2eIp = 'Please enter a valid IP address.';
      }
    }
    if (wacType !== WAC_TYPES.none) {
      if (wacUrl.trim() === '') {
        errors.wacUrl = 'Please enter a URL.';
      }
      if (wacUsername === '') {
        errors.wacUsername = 'Please enter a username.';
      }
      if (
        wacPassword === '' &&
        (type === FormType.CREATE ||
          (type == FormType.EDIT && !networkConfig.wireless_controller))
      ) {
        errors.wacPassword = 'Please enter a password.';
      }
    }
    if (Object.keys(errors).length > 0) {
      this.setState({formErrors: errors});
      return;
    }

    // Construct request
    const data = {
      name: network.trim(),
      primary: {
        api_ip: primaryApiIp ? primaryApiIp.trim() : '',
        api_port: formParseInt(this.state.primaryApiPort),
        e2e_ip: primaryE2eIp ? primaryE2eIp.trim() : '',
        e2e_port: formParseInt(this.state.primaryE2ePort),
      },
      backup: {
        api_ip: backupApiIp ? backupApiIp.trim() : '',
        api_port: formParseInt(this.state.backupApiPort),
        e2e_ip: backupE2eIp ? backupE2eIp.trim() : '',
        e2e_port: formParseInt(this.state.backupE2ePort),
      },
      ...(wacType !== WAC_TYPES.none
        ? {
            wireless_controller: {
              type: wacType,
              url: wacUrl.trim(),
              username: wacUsername,
              password: wacPassword,
            },
          }
        : {}),
    };

    if (type === FormType.CREATE) {
      this.props.onCreateNetwork(data, waitForNetworkListRefresh);
    } else if (type === FormType.EDIT) {
      data.id = networkConfig.id;
      this.props.onEditNetwork(data, waitForNetworkListRefresh);
    }
    onClose();
  };

  render() {
    return (
      <NetworkListContext.Consumer>
        {this.renderContext}
      </NetworkListContext.Consumer>
    );
  }

  renderContext = listContext => {
    const {classes, open, type, onClose, networkConfig} = this.props;
    const {formErrors} = this.state;
    const {waitForNetworkListRefresh} = listContext;
    const title =
      type === FormType.CREATE
        ? 'Create Network'
        : type === FormType.EDIT
        ? 'Edit Network'
        : '?';

    // Create inputs
    const inputs = [
      {
        func: createTextInput,
        label: 'Network',
        value: 'network',
        required: true,
        autoFocus: true,
      },
      {_heading: 'Primary Controller'},
      {
        func: createTextInput,
        label: 'Primary API IPv6',
        value: 'primaryApiIp',
        required: true,
      },
      {
        func: createNumericInput,
        label: 'Primary API Port',
        value: 'primaryApiPort',
        step: 1,
        required: true,
      },
      {
        func: createTextInput,
        label: 'Primary E2E IPv6',
        value: 'primaryE2eIp',
        required: true,
      },
      {
        func: createNumericInput,
        label: 'Primary E2E Port',
        value: 'primaryE2ePort',
        step: 1,
        required: true,
      },
      {_heading: 'Backup Controller'},
      {
        func: createTextInput,
        label: 'Backup API IPv6',
        value: 'backupApiIp',
      },
      {
        func: createNumericInput,
        label: 'Backup API Port',
        value: 'backupApiPort',
        step: 1,
      },
      {
        func: createTextInput,
        label: 'Backup E2E IPv6',
        value: 'backupE2eIp',
      },
      {
        func: createNumericInput,
        label: 'Backup E2E Port',
        value: 'backupE2ePort',
        step: 1,
      },
      {_heading: 'Wireless AP Controller'},
      {
        func: createSelectInput,
        label: 'AP Type',
        value: 'wacType',
        menuItems: Object.keys(WAC_TYPES).map(wacType => (
          <MenuItem key={wacType} value={wacType}>
            {toTitleCase(wacType)}
          </MenuItem>
        )),
      },
      ...(this.state.wacType === WAC_TYPES.none
        ? []
        : [
            {
              func: createTextInput,
              label: 'URL',
              value: 'wacUrl',
            },
            {
              func: createTextInput,
              label: 'Username',
              value: 'wacUsername',
            },
            {
              func: createTextInput,
              label: 'Password',
              placeholder:
                type == FormType.EDIT && networkConfig.wireless_controller
                  ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
                  : null,
              value: 'wacPassword',
              isPassword: true,
            },
          ]),
    ];

    return (
      <MaterialModal
        open={open}
        onClose={onClose}
        onEnter={this.onEnter}
        modalTitle={title}
        modalContentText="Fill out the network configuration in the form below."
        modalContent={
          <div className={classes.modalContent}>
            {inputs.map(input =>
              input.hasOwnProperty('_heading') ? (
                <Typography
                  key={input._heading}
                  className={classes.formHeading}
                  variant="h6">
                  {input._heading}
                </Typography>
              ) : (
                <React.Fragment key={input.value}>
                  {input.func({...input}, this.state, this.setState.bind(this))}
                  {formErrors.hasOwnProperty(input.value) ? (
                    <Typography variant="subtitle2" className={classes.red}>
                      {formErrors[input.value]}
                    </Typography>
                  ) : null}
                </React.Fragment>
              ),
            )}
          </div>
        }
        modalActions={
          <>
            <Button
              className={classes.button}
              onClick={() => this.handleSubmit(waitForNetworkListRefresh)}
              variant="outlined">
              Save
            </Button>
            <Button
              className={classes.button}
              onClick={onClose}
              variant="outlined">
              Cancel
            </Button>
          </>
        }
      />
    );
  };
}

ModalNmsConfigForm.propTypes = {
  classes: PropTypes.object.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.oneOf(Object.keys(FormType)),
  networkConfig: PropTypes.object,
  onCreateNetwork: PropTypes.func.isRequired,
  onEditNetwork: PropTypes.func.isRequired,
  networkList: PropTypes.object,
};

export default withStyles(styles, {withTheme: true})(ModalNmsConfigForm);
