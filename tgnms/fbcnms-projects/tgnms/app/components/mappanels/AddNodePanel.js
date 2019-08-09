/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import MenuItem from '@material-ui/core/MenuItem';
import PropTypes from 'prop-types';
import React from 'react';
import Switch from '@material-ui/core/Switch';
import {
  NodeType,
  PolarityType,
} from '../../../thrift/gen-nodejs/Topology_types';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {
  createNumericInput,
  createReactSelectInput,
  createSelectInput,
  createTextInput,
  formParseFloat,
  formParseInt,
} from '../../helpers/FormHelpers';
import {
  getEditIcon,
  sendTopologyBuilderRequest,
  sendTopologyEditRequest,
} from '../../helpers/MapPanelHelpers';
import {isEqual} from 'lodash';
import {
  supportsUserSpecifiedPolairtyAndGolay,
  useNodeWlanMacs,
} from '../../helpers/TgFeatures';
import {toTitleCase} from '../../helpers/StringHelpers';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  button: {
    margin: '8px 4px',
    float: 'right',
  },
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(),
  },
});

const FormType = Object.freeze({
  CREATE: 'CREATE',
  EDIT: 'EDIT',
});

class AddNodePanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showAdvanced: false,

      // Node properties
      name: '',
      is_primary: null,
      node_type: null,
      mac_addr: '',
      wlan_mac_addrs: '',
      pop_node: null,
      polarity: null,
      site_name: '',
      ant_azimuth: 0,
      txGolayIdx: null,
      rxGolayIdx: null,

      ...this.props.initialParams,
    };
  }

  componentDidUpdate(prevProps: Props) {
    // Update state if initial values were added
    // TODO Do this somewhere else?
    if (
      Object.keys(this.props.initialParams).length > 0 &&
      !isEqual(this.props.initialParams, prevProps.initialParams)
    ) {
      this.setState(this.props.initialParams);
    }
  }

  onSubmit() {
    const {initialParams, onClose, networkName, formType} = this.props;

    const node = {
      name: this.state.name.trim(),
      is_primary: this.state.is_primary,
      node_type: this.state.node_type,
      mac_addr: this.state.mac_addr,
      wlan_mac_addrs: this.state.wlan_mac_addrs
        .split(',')
        .map(mac => mac.trim())
        .filter(mac => mac.length),
      pop_node: this.state.pop_node,
      polarity: this.state.node_polarity,
      site_name: this.state.site_name,
      ant_azimuth: formParseFloat(this.state.ant_azimuth),
      golay_idx: {
        txGolayIdx: formParseInt(this.state.txGolayIdx),
        rxGolayIdx: formParseInt(this.state.rxGolayIdx),
      },
    };

    if (formType === FormType.CREATE) {
      sendTopologyBuilderRequest(networkName, 'addNode', {node}, 'node', {
        onSuccess: onClose,
      });
    } else if (formType === FormType.EDIT) {
      if (node.mac_addr !== initialParams.mac_addr) {
        // Set MAC address first via a separate API call
        const setMac = {
          nodeName: initialParams.name,
          nodeMac: node.mac_addr,
          force: false,
        };
        sendTopologyEditRequest(
          networkName,
          'setNodeMacAddress',
          setMac,
          'node',
          {
            // Send /editNode request only if successful
            onResultsOverride: ({success, msg}, successSwal, failureSwal) => {
              if (success) {
                // don't post to /editNode if no changes
                if (!this.nodeFormChanged()) {
                  successSwal(msg);
                  onClose();
                  return;
                }
                const data = {
                  nodeName: initialParams.name,
                  newNode: node,
                };
                apiServiceRequest(networkName, 'editNode', data)
                  .then(_result => {
                    successSwal(msg);
                    onClose();
                  })
                  .catch(error => {
                    // TODO - If this fails, the first call isn't reverted and
                    // generally bad things will happen. :(
                    failureSwal(getErrorTextFromE2EAck(error));
                  });
              } else {
                failureSwal(msg);
              }
            },
          },
        );
      } else if (this.nodeFormChanged()) {
        // Only send /editNode request
        const data = {
          nodeName: initialParams.name,
          newNode: node,
        };
        sendTopologyEditRequest(networkName, 'editNode', data, 'node', {
          onSuccess: onClose,
        });
      }
    }
  }

  renderForm() {
    const {classes, ctrlVersion, formType} = this.props;
    const {showAdvanced} = this.state;

    // Change form based on form type
    const submitButtonText =
      formType === FormType.EDIT ? 'Save Changes' : 'Add Node';

    // Create menu items
    const siteOptions = this.props.topology.sites.map(site => ({
      label: site.name,
      value: site.name,
    }));
    const nodeTypeMenuItems = Object.keys(NodeType).map(nodeTypeName => (
      <MenuItem key={nodeTypeName} value={NodeType[nodeTypeName]}>
        {nodeTypeName}
      </MenuItem>
    ));
    const popMenuItems = [
      <MenuItem key="yes" value={true}>
        Yes
      </MenuItem>,
      <MenuItem key="no" value={false}>
        No
      </MenuItem>,
    ];
    const hardwareMenuItems = [
      <MenuItem key="primary" value={true}>
        Primary
      </MenuItem>,
      <MenuItem key="secondary" value={false}>
        Secondary
      </MenuItem>,
    ];
    const polarityMenuItems = Object.keys(PolarityType).map(polarityName => (
      <MenuItem key={polarityName} value={PolarityType[polarityName]}>
        {toTitleCase(polarityName)}
      </MenuItem>
    ));

    // Create inputs
    const inputs = [
      {
        func: createTextInput,
        label: 'Node Name',
        value: 'name',
        required: true,
        _editable: true,
      },
      {
        func: createTextInput,
        label: 'MAC Address',
        value: 'mac_addr',
        required: false,
        _editable: true,
      },
      {
        func: createReactSelectInput,
        label: 'Site',
        value: 'site_name',
        required: true,
        selectOptions: siteOptions,
      },
      {
        func: createSelectInput,
        label: 'Node Type',
        value: 'node_type',
        required: true,
        menuItems: nodeTypeMenuItems,
      },
      {
        func: createSelectInput,
        label: 'PoP Node',
        value: 'pop_node',
        required: false,
        menuItems: popMenuItems,
        _editable: true,
      },
      {
        func: createSelectInput,
        label: 'Hardware',
        value: 'is_primary',
        required: false,
        menuItems: hardwareMenuItems,
        _editable: true,
      },
    ];
    const advancedInputs = [
      ...(supportsUserSpecifiedPolairtyAndGolay(ctrlVersion)
        ? [
            {
              func: createSelectInput,
              label: 'Polarity',
              value: 'polarity',
              required: false,
              menuItems: polarityMenuItems,
            },
            {
              func: createNumericInput,
              label: 'Tx Golay Index',
              value: 'txGolayIdx',
              required: false,
              step: 1,
            },
            {
              func: createNumericInput,
              label: 'Rx Golay Index',
              value: 'rxGolayIdx',
              required: false,
              step: 1,
            },
          ]
        : []),
      ...(useNodeWlanMacs(ctrlVersion)
        ? [
            {
              // TODO support editing this!
              func: createTextInput,
              label: 'WLAN MAC Addresses',
              helperText:
                'MAC addresses of all WLAN interfaces, ' +
                'as comma-separated values.',
              value: 'wlan_mac_addrs',
              required: false,
            },
          ]
        : []),
      {
        func: createNumericInput,
        label: 'Azimuth',
        helperText:
          'In degrees (0-360), with default 0 (north). ' +
          'Only used for nodes without links.',
        value: 'ant_azimuth',
        required: false,
        step: 1,
        _editable: true,
      },
    ];

    return (
      <div style={{width: '100%'}}>
        {inputs
          .filter(input => formType !== FormType.EDIT || input._editable)
          .map(input =>
            input.func({...input}, this.state, this.setState.bind(this)),
          )}

        <Collapse in={showAdvanced}>
          {advancedInputs
            .filter(input => formType !== FormType.EDIT || input._editable)
            .map(input =>
              input.func({...input}, this.state, this.setState.bind(this)),
            )}
        </Collapse>
        <FormControlLabel
          control={
            <Switch
              color="primary"
              checked={showAdvanced}
              onChange={() => this.setState({showAdvanced: !showAdvanced})}
            />
          }
          label="Show Advanced"
        />

        <div>
          <Button
            className={classes.button}
            variant="contained"
            color="primary"
            size="small"
            onClick={() => this.onSubmit()}>
            {submitButtonText}
          </Button>
          <Button
            className={classes.button}
            variant="outlined"
            size="small"
            onClick={() => this.props.onClose()}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const {
      classes,
      className,
      expanded,
      onPanelChange,
      initialParams,
      formType,
    } = this.props;

    // Change form based on form type
    const title = formType === FormType.EDIT ? initialParams.name : 'Add Node';
    const titleIcon =
      formType === FormType.EDIT
        ? getEditIcon({classes: {root: classes.iconCentered}})
        : null;

    return (
      <CustomExpansionPanel
        className={className}
        title={title}
        titleIcon={titleIcon}
        details={this.renderForm()}
        expanded={expanded}
        onChange={onPanelChange}
      />
    );
  }

  // checks if any of the "editNode" params have changed from initial values
  nodeFormChanged = () => {
    const keysToCheck = new Set([
      'name',
      'is_primary',
      'wlan_mac_addrs',
      'pop_node',
      'site_name',
      'ant_azimuth',
    ]);
    for (const key of Object.keys(this.state)) {
      if (
        keysToCheck.has(key) &&
        this.state[key] !== this.props.initialParams[key]
      ) {
        return true;
      }
    }
    return false;
  };
}

AddNodePanel.propTypes = {
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  expanded: PropTypes.bool.isRequired,
  onPanelChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  formType: PropTypes.oneOf(Object.keys(FormType)),
  initialParams: PropTypes.object,
  ctrlVersion: PropTypes.string,
  networkName: PropTypes.string.isRequired,
  topology: PropTypes.object.isRequired,
};

export default withStyles(styles)(AddNodePanel);
