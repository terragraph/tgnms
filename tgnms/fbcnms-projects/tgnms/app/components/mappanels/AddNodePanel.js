/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import EditRadioMacs from './EditRadioMacs';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import MenuItem from '@material-ui/core/MenuItem';
import React from 'react';
import Switch from '@material-ui/core/Switch';
import swal from 'sweetalert2';
import {
  NodeTypeValueMap,
  PolarityTypeValueMap as PolarityType,
} from '../../../shared/types/Topology';
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
} from '../../helpers/MapPanelHelpers';
import {isEqual} from 'lodash';
import {
  supportsUserSpecifiedPolairtyAndGolay,
  useNodeWlanMacs,
} from '../../helpers/TgFeatures';
import {toTitleCase} from '../../helpers/StringHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {EditNodeParams} from './MapPanelTypes';
import type {NetworkConfig} from '../../NetworkContext';
import type {
  PolarityTypeType,
  TopologyType,
} from '../../../shared/types/Topology';

export type ApiRequestAttemptsType = {
  networkName: string,
  apiMethod: string,
  data: Object,
};

type InputType = {
  _editable?: boolean,
  func: (InputType, State, Object) => any,
  helperText?: string,
  label: string,
  menuItems?: Array<Object>,
  required: boolean,
  networkConfig?: ?NetworkConfig,
  networkName?: ?string,
  value: string,
};

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

type Props = {
  classes: {[string]: string},
  className?: string,
  ctrlVersion: string,
  expanded: boolean,
  formType: string,
  initialParams: Object,
  networkConfig: NetworkConfig,
  networkName: string,
  onPanelChange: () => any,
  onClose: () => any,
  topology: TopologyType,
};

type State = {
  ...$Exact<EditNodeParams>,
  // EditNodeParams is used other places in the code where wlan_mac_addrs
  // is exepcted to be an array so we redefine for this file
  wlan_mac_addrs: string,
  showAdvanced: boolean,
  node_polarity: PolarityTypeType,
  wlanMacEdits: Array<ApiRequestAttemptsType>,
  error: boolean,
};

class AddNodePanel extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      showAdvanced: false,

      // Node properties
      name: '',
      is_primary: null,
      node_polarity: null,
      node_type: null,
      mac_addr: '',
      wlan_mac_addrs: '',
      pop_node: null,
      polarity: null,
      site_name: '',
      ant_azimuth: 0,
      txGolayIdx: null,
      rxGolayIdx: null,

      ...props.initialParams,
      wlanMacEdits: [],
      error: false,
    };
  }

  componentDidUpdate(prevProps: Props) {
    // Update state if initial values were added
    // TODO Do this somewhere else?
    if (
      Object.keys(this.props.initialParams).length > 0 &&
      !isEqual(this.props.initialParams, prevProps.initialParams)
    ) {
      this.updateInitialParams();
    }
  }

  updateInitialParams() {
    this.setState(this.props.initialParams);
  }

  renderRadioMacs(input, state, setState) {
    const {label, required, networkConfig, networkName} = input;
    return (
      <EditRadioMacs
        key="editRadioMacs"
        radioMacs={state.wlan_mac_addrs}
        label={label}
        macAddr={state.mac_addr}
        required={required}
        networkConfig={networkConfig}
        name={state.name}
        networkName={networkName ? networkName : ''}
        onRadioMacChange={radioMacChanges =>
          setState({wlanMacEdits: radioMacChanges})
        }
        submitButtonStatus={error => setState({error: error})}
      />
    );
  }

  onSubmit() {
    const {initialParams, onClose, networkName, formType} = this.props;
    const {wlanMacEdits} = this.state;
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
      node.wlan_mac_addrs = wlanMacEdits.map(
        macEdit => macEdit.data.wlanMacs[0],
      );
      sendTopologyBuilderRequest(networkName, 'addNode', {node}, 'node', {
        onSuccess: onClose,
      });
    } else if (formType === FormType.EDIT) {
      const apiRequestAttempts = [];
      if (node.mac_addr !== initialParams.mac_addr) {
        // Set MAC address first via a separate API call
        const setMac = {
          nodeName: initialParams.name,
          nodeMac: node.mac_addr,
          force: false,
        };
        apiRequestAttempts.push({
          networkName: networkName,
          apiMethod: 'setNodeMacAddress',
          data: setMac,
        });
      }
      if (wlanMacEdits.length > 0) {
        // Set Radio MAC address second via separate API calls
        apiRequestAttempts.push(...wlanMacEdits);
      }
      if (this.nodeFormChanged()) {
        // send /editNode request thrid
        const data = {
          nodeName: initialParams.name,
          newNode: node,
        };
        apiRequestAttempts.push({
          networkName: networkName,
          apiMethod: 'editNode',
          data: data,
        });
      }

      if (apiRequestAttempts.length > 0) {
        swal({
          title: 'Are You Sure?',
          text: 'You are making changes to a node in this topology.',
          type: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Confirm',
          showLoaderOnConfirm: true,
          inputClass: 'swal-input',
          preConfirm: () =>
            Promise.all(
              apiRequestAttempts.map(
                apiRequestAttempt =>
                  new Promise((resolve, reject) => {
                    const {networkName, apiMethod, data} = apiRequestAttempt;
                    apiServiceRequest(networkName, apiMethod, data)
                      .then(_response =>
                        resolve({
                          success: true,
                        }),
                      )
                      .catch(er =>
                        reject({
                          success: false,
                          msg: getErrorTextFromE2EAck(er),
                        }),
                      );
                  }),
              ),
            )
              .then(_response => ({success: true}))
              .catch(err => err),
        }).then(result => {
          if (result.dismiss) {
            return;
          }

          if (result.value.success) {
            swal({
              title: 'Success!',
              type: 'success',
              text: 'The changes to this node were saved sucessfully.',
            });
            onClose();
          } else {
            swal({
              title: 'Failed!',
              // @format and flow lint disagree on format here
              // prettier-ignore
              html: `The node could not be saved.<p><tt>${
                result.value.msg
              }</tt></p>`,
              type: 'error',
            });
          }
        });
      }
    }
  }

  renderForm() {
    const {
      classes,
      ctrlVersion,
      formType,
      networkConfig,
      networkName,
    } = this.props;
    const {error, showAdvanced} = this.state;
    // Change form based on form type
    const submitButtonText =
      formType === FormType.EDIT ? 'Save Changes' : 'Add Node';

    // Create menu items
    const siteOptions = this.props.topology.sites.map(site => ({
      label: site.name,
      value: site.name,
    }));
    const nodeTypeMenuItems = Object.keys(NodeTypeValueMap).map(
      nodeTypeName => (
        <MenuItem key={nodeTypeName} value={NodeTypeValueMap[nodeTypeName]}>
          {nodeTypeName}
        </MenuItem>
      ),
    );
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
    const inputs: Array<InputType> = [
      {
        func: createTextInput,
        label: 'Node Name',
        value: 'name',
        required: true,
        _editable: true,
      },
      {
        func: createTextInput,
        label: 'Node MAC Address',
        value: 'mac_addr',
        required: false,
        _editable: true,
      },
      useNodeWlanMacs(ctrlVersion)
        ? {
            func: this.renderRadioMacs,
            label: 'Radio MAC Address',
            value: 'wlan_mac_addrs',
            required: false,
            networkConfig: networkConfig,
            networkName: networkName,
            _editable: true,
          }
        : {},
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
    const advancedInputs: Array<InputType> = [
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
            disabled={error}
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

export default withStyles(styles)(AddNodePanel);
