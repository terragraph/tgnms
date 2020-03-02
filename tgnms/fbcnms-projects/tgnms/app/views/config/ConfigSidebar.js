/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ActionsMenu from '../../components/mappanels/ActionsMenu';
import Button from '@material-ui/core/Button';
import CheckIcon from '@material-ui/icons/Check';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import Input from '@material-ui/core/Input';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import MenuItem from '@material-ui/core/MenuItem';
import ModalClearNodeAutoConfig from './ModalClearNodeAutoConfig';
import ModalConfigGet from './ModalConfigGet';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import StatusIndicator, {
  StatusIndicatorColor,
} from '../../components/common/StatusIndicator';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {CtrlVerType, ctrlVerBefore} from '../../helpers/VersionHelper';
import {NetworkConfigMode} from '../../constants/ConfigConstants';
import {apiServiceRequestWithConfirmation} from '../../apiutils/ServiceAPIUtil';
import {createSelectInput} from '../../helpers/FormHelpers';
import {isEqual} from 'lodash';
import {shallowEqual} from '../../helpers/ConfigHelpers';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';
import type {NetworkConfig} from '../../contexts/NetworkContext';
import type {NodeConfigStatusType} from '../../helpers/ConfigHelpers';
import type {NodeConfigType} from '../../../shared/types/NodeConfig';

const styles = theme => ({
  header: {
    padding: '16px 20px 0',
  },
  selectNodeHeader: {
    padding: '8px 20px 0',
  },
  sidePad: {
    padding: '0 20px',
  },
  grow: {
    flexGrow: 1,
  },
  bottomContainer: {
    paddingTop: theme.spacing(),
    paddingBottom: theme.spacing(),
  },
  nodeListPaper: {
    overflowY: 'auto',
    marginTop: 4,
  },
  selectedNodePrimaryText: {
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  selectedNodeSecondaryText: {
    lineHeight: 1.2,
  },
  nodeupdateIcon: {
    fontSize: 14,
    verticalAlign: 'text-top',
    paddingLeft: theme.spacing(),
  },
  nodeConfigSearch: {
    border: '1px solid lightGray',
    fontSize: 12,
    height: theme.spacing(3),
    padding: theme.spacing(),
  },
});

// Editor type
const editorOptions = Object.freeze([
  {label: 'Table', value: false},
  {label: 'JSON', value: true},
]);

// Node list filters
const nodeFilterOptions = Object.freeze([
  {
    label: 'All nodes',
    filter: _node => true,
  },
  {
    label: 'Nodes with overrides',
    filter: node => node.hasOverride,
  },
  {
    label: 'CNs only',
    filter: node => node.isCn,
  },
]);

// Create fake "base layer"?
const e2eConfigBaseOptions = Object.freeze([
  {label: 'Show all', value: true},
  {label: 'Hidden', value: false},
]);

type Props = {
  classes: {[string]: string},
  editMode: string, // NetworkConfigMode
  useRawJsonEditor: boolean,
  networkName: string,
  networkConfig: NetworkConfig,
  onChangeEditorType: boolean => any,
  selectedNodeInfo: ?Object,
  onSelectNode: NodeConfigStatusType => any,
  baseConfigs: ?{[string]: $Shape<NodeConfigType>},
  selectedImage: ?string,
  onSelectImage: string => void,
  hardwareBaseConfigs: ?{[string]: {[string]: $Shape<NodeConfigType>}},
  firmwareBaseConfigs: ?{[string]: $Shape<NodeConfigType>},
  selectedHardwareType: ?string,
  selectedFirmwareVersion: ?string,
  onSelectHardwareType: string => void,
  onSelectFirmwareVersion: string => void,
  topologyNodeList: ?Array<NodeConfigStatusType>,
  useMetadataBase: ?boolean,
  onSetConfigBase: boolean => void,
  onConfigRefresh: (string, boolean) => void,
  onUpdateSnackbar: (string, string) => void,
};

type State = {
  useRawJsonEditor: boolean,
  selectedImage: string,
  selectedHardwareType: string,
  selectedFirmwareVersion: string,
  nodeFilter: string,
  useMetadataBase: boolean,
  searchFilter: string,
  showFullNodeConfigModal: boolean,
  showClearNodeAutoConfigModal: boolean,
};

class ConfigSidebar extends React.Component<Props, State> {
  state = {
    useRawJsonEditor: false,
    selectedImage: '',
    selectedFirmwareVersion: '',
    selectedHardwareType: '',
    nodeFilter: nodeFilterOptions[0].label,
    useMetadataBase: false,
    searchFilter: '',
    showFullNodeConfigModal: false,
    showClearNodeAutoConfigModal: false,
  };

  static getDerivedStateFromProps(nextProps, _prevState) {
    // Update local select input fields
    return {
      useRawJsonEditor: nextProps.useRawJsonEditor,
      selectedImage: nextProps.selectedImage,
      selectedHardwareType: nextProps.selectedHardwareType,
      selectedFirmwareVersion: nextProps.selectedFirmwareVersion,
      useMetadataBase: nextProps.useMetadataBase,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Optimization: only props that could change with same underlying config
    return (
      !shallowEqual(this.state, nextState) ||
      this.props.editMode !== nextProps.editMode ||
      this.props.useRawJsonEditor !== nextProps.useRawJsonEditor ||
      this.props.selectedImage !== nextProps.selectedImage ||
      this.props.selectedHardwareType !== nextProps.selectedHardwareType ||
      this.props.selectedFirmwareVersion !==
        nextProps.selectedFirmwareVersion ||
      !isEqual(this.props.selectedNodeInfo, nextProps.selectedNodeInfo) ||
      !isEqual(this.props.topologyNodeList, nextProps.topologyNodeList)
    );
  }

  filterTopologyNodes = nodeFilter => {
    // Filters the topology nodes using the given filter option string
    const {topologyNodeList} = this.props;
    const {searchFilter} = this.state;

    const filterOption = nodeFilterOptions.find(
      option => nodeFilter === option.label,
    );
    let filteredTopologyNodeList = topologyNodeList || [];
    if (filterOption) {
      filteredTopologyNodeList = filteredTopologyNodeList.filter(
        filterOption.filter,
      );
    }
    if (searchFilter) {
      filteredTopologyNodeList = filteredTopologyNodeList.filter(node =>
        node.name.includes(searchFilter),
      );
    }
    return filteredTopologyNodeList;
  };

  handleChangeFilterOption = newNodeFilter => {
    // After changing the node filter, check if the currently selected node is
    // still displayed. If not, pick a different node (if possible).
    const {selectedNodeInfo, onSelectNode} = this.props;

    const renderedNodeList = this.filterTopologyNodes(newNodeFilter);
    if (
      !selectedNodeInfo ||
      !renderedNodeList.find(node => selectedNodeInfo.name === node.name)
    ) {
      onSelectNode(renderedNodeList[0] || null);
    }
  };

  handleOpenFullNodeConfigModal = () => {
    // Open the "Full Node Configuration" modal
    this.setState({showFullNodeConfigModal: true});
  };

  handlePolarityOptCommand = () => {
    // Trigger polarity optimization
    const {networkName, onConfigRefresh, onUpdateSnackbar} = this.props;

    const data = {};
    apiServiceRequestWithConfirmation(
      networkName,
      'triggerPolarityOptimization',
      data,
      {
        title: 'Optimize Polarity Allocation',
        desc: 'Do you want to re-assign polarity values across the network?',
        checkbox: 'Clear user-assigned polarities',
        processInput: (data, value) => {
          return {...data, clearUserPolarityConfig: !!value};
        },
        onResultsOverride: value => {
          if (value.success) {
            onConfigRefresh(networkName, false);
            onUpdateSnackbar(
              'Polarity optimization was successful.',
              'success',
            );
          } else {
            onUpdateSnackbar('Polarity optimization failed.', 'error');
          }
        },
      },
    );
  };

  handleGolayOptCommand = () => {
    // Trigger Golay optimization
    const {networkName, onConfigRefresh, onUpdateSnackbar} = this.props;

    const data = {};
    apiServiceRequestWithConfirmation(
      networkName,
      'triggerGolayOptimization',
      data,
      {
        title: 'Optimize Golay Allocation',
        desc: 'Do you want to re-assign Golay values across the network?',
        checkbox: 'Clear user-assigned Golays',
        processInput: (data, value) => {
          return {...data, clearUserConfig: !!value};
        },
        onResultsOverride: value => {
          if (value.success) {
            onConfigRefresh(networkName, false);
            onUpdateSnackbar('Golay optimization was successful.', 'success');
          } else {
            onUpdateSnackbar('Golay optimization failed.', 'error');
          }
        },
      },
    );
  };

  handleControlSuperframeOptCommand = () => {
    // Trigger control superframe optimization
    const {networkName, onConfigRefresh, onUpdateSnackbar} = this.props;

    const data = {};
    apiServiceRequestWithConfirmation(
      networkName,
      'triggerControlSuperframeOptimization',
      data,
      {
        title: 'Optimize Control Superframe Allocation',
        desc:
          'Do you want to re-assign control superframe values across the network?',
        checkbox: 'Clear user-assigned values',
        processInput: (data, value) => {
          return {...data, clearUserConfig: !!value};
        },
        onResultsOverride: value => {
          if (value.success) {
            onConfigRefresh(networkName, false);
            onUpdateSnackbar(
              'Control superframe optimization was successful.',
              'success',
            );
          } else {
            onUpdateSnackbar(
              'Control superframe optimization failed.',
              'error',
            );
          }
        },
      },
    );
  };

  handleChannelOptCommand = () => {
    // Trigger channel optimization
    const {networkName, onConfigRefresh, onUpdateSnackbar} = this.props;

    const data = {};
    apiServiceRequestWithConfirmation(
      networkName,
      'triggerChannelOptimization',
      data,
      {
        title: 'Optimize Channel Allocation',
        desc: 'Do you want to re-assign channel values across the network?',
        checkbox: 'Clear user-assigned channels',
        processInput: (data, value) => {
          return {...data, clearUserChannelConfig: !!value};
        },
        onResultsOverride: value => {
          if (value.success) {
            onConfigRefresh(networkName, false);
            onUpdateSnackbar('Channel optimization was successful.', 'success');
          } else {
            onUpdateSnackbar('Channel optimization failed.', 'error');
          }
        },
      },
    );
  };

  handleCloseClearNodeAutoConfigModal = () => {
    this.setState({showClearNodeAutoConfigModal: false});
  };

  handleClearNodeAutoConfig() {
    this.setState({showClearNodeAutoConfigModal: true});
  }

  handleCloseFullNodeConfigModal = () => {
    // Close the "Full Node Configuration" modal
    this.setState({showFullNodeConfigModal: false});
  };

  handleInput = e => {
    // Filters nodes based on input value
    this.setState({searchFilter: e.target.value});
  };

  renderNodeupdateIcon = nodeInfo => {
    // Render the nodeupdate bundle state icon (if applicable) for a node entry
    const {classes} = this.props;

    return nodeInfo.hasOwnProperty('nodeupdateBundleServed') ? (
      <Tooltip
        title={`Configuration bundle ${
          nodeInfo.nodeupdateBundleServed ? 'received' : 'pending'
        }`}
        placement="right">
        {nodeInfo.nodeupdateBundleServed ? (
          <CheckIcon className={classes.nodeupdateIcon} />
        ) : (
          <CloudUploadIcon className={classes.nodeupdateIcon} />
        )}
      </Tooltip>
    ) : null;
  };

  renderNetworkActions = () => {
    const {networkConfig} = this.props;
    const ctrlVersion = networkConfig.controller_version;

    const actions = [];
    if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M31)) {
      actions.push({
        label: 'Optimize Polarity Allocation',
        func: () => this.handlePolarityOptCommand(),
      });
    }
    if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M38)) {
      actions.push({
        label: 'Optimize Golay Allocation',
        func: () => this.handleGolayOptCommand(),
      });
    }
    if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M37)) {
      actions.push({
        label: 'Optimize Control Superframe Allocation',
        func: () => this.handleControlSuperframeOptCommand(),
      });
    }
    if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M42)) {
      actions.push({
        label: 'Optimize Channel Allocation',
        func: () => this.handleChannelOptCommand(),
      });
    }
    if (!ctrlVerBefore(ctrlVersion, CtrlVerType.M41)) {
      actions.push({
        label: 'Clear Node Auto Configuration',
        func: () => this.handleClearNodeAutoConfig(),
      });
    }
    const actionItems = [{heading: 'Actions', actions}];
    return actionItems.length ? (
      <ActionsMenu
        options={{
          actionItems,
          buttonClassName: 'actionsButton',
          buttonName: 'Network Optimization\u2026',
        }}
      />
    ) : null;
  };

  renderNetworkSidebar = () => {
    // Render the left sidebar for network config
    const {
      classes,
      useRawJsonEditor,
      baseConfigs,
      hardwareBaseConfigs,
      firmwareBaseConfigs,
      networkName,
      onSelectImage,
      onSelectHardwareType,
      onSelectFirmwareVersion,
      topologyNodeList,
    } = this.props;

    const {showClearNodeAutoConfigModal} = this.state;
    const inputs = useRawJsonEditor
      ? []
      : [
          {
            func: createSelectInput,
            label: 'Change Base Version',
            value: 'selectedImage',
            menuItems: Object.keys(baseConfigs || {}).map(ver => (
              <MenuItem key={ver} value={ver}>
                {ver}
              </MenuItem>
            )),
            onChange: onSelectImage,
          },
          {
            func: createSelectInput,
            label: 'Change Firmware Version',
            value: 'selectedFirmwareVersion',
            menuItems: Object.keys(firmwareBaseConfigs || {}).map(ver => (
              <MenuItem key={ver} value={ver}>
                {ver}
              </MenuItem>
            )),
            onChange: onSelectFirmwareVersion,
          },
          {
            func: createSelectInput,
            label: 'Change Hardware Type',
            value: 'selectedHardwareType',
            menuItems: Object.keys(hardwareBaseConfigs || {}).map(ver => (
              <MenuItem key={ver} value={ver}>
                {ver}
              </MenuItem>
            )),
            onChange: onSelectHardwareType,
          },
        ];

    return (
      <>
        <div className={classes.sidePad}>
          {inputs.map(input =>
            input.func({...input}, this.state, this.setState.bind(this)),
          )}
        </div>
        <div className={classes.grow} />
        <div className={classes.bottomContainer}>
          {this.renderNetworkActions()}
        </div>
        <ModalClearNodeAutoConfig
          isOpen={showClearNodeAutoConfigModal}
          onClose={this.handleCloseClearNodeAutoConfigModal}
          networkName={networkName}
          nodes={topologyNodeList ? topologyNodeList : []}
        />
      </>
    );
  };

  renderNodeSidebar = () => {
    // Render the left sidebar for node config
    const {
      classes,
      networkConfig,
      networkName,
      selectedNodeInfo,
      onSelectNode,
    } = this.props;
    const {nodeFilter, searchFilter, showFullNodeConfigModal} = this.state;
    const renderedNodeList = this.filterTopologyNodes(nodeFilter);

    const inputs = [
      {
        func: createSelectInput,
        label: 'Filter',
        value: 'nodeFilter',
        menuItems: nodeFilterOptions.map(option => (
          <MenuItem key={option.label} value={option.label}>
            {option.label}
          </MenuItem>
        )),
        onChange: this.handleChangeFilterOption,
      },
    ];

    return (
      <>
        <div className={classes.sidePad}>
          {inputs.map(input =>
            input.func({...input}, this.state, this.setState.bind(this)),
          )}
        </div>

        <div className={classes.selectNodeHeader}>
          <Typography variant="caption" gutterBottom>
            Select Node
          </Typography>
          <Input
            className={classes.nodeConfigSearch}
            value={searchFilter}
            onChange={this.handleInput}
            placeholder="Filter"
            fullWidth
            disableUnderline
          />
        </div>
        <Paper className={classes.nodeListPaper} elevation={1}>
          <List component="nav">
            {renderedNodeList.length === 0 ? (
              <ListItem>
                <Typography variant="body2">No matching nodes.</Typography>
              </ListItem>
            ) : null}
            {renderedNodeList.map(node => {
              const isSelected =
                selectedNodeInfo && selectedNodeInfo.name === node.name;
              return (
                <ListItem
                  key={node.name}
                  button
                  dense
                  selected={isSelected}
                  onClick={() => onSelectNode(node)}>
                  <ListItemText
                    primary={
                      <>
                        {node.name}
                        {isSelected && selectedNodeInfo
                          ? this.renderNodeupdateIcon(selectedNodeInfo)
                          : null}
                      </>
                    }
                    primaryTypographyProps={
                      node.hasOverride
                        ? {
                            className: classes.selectedNodePrimaryText,
                            variant: 'subtitle2',
                          }
                        : null
                    }
                    secondary={
                      isSelected && !node.isAlive
                        ? 'This node is offline, so the base values shown ' +
                          'may be inaccurate.'
                        : null
                    }
                    secondaryTypographyProps={{
                      className: classes.selectedNodeSecondaryText,
                    }}
                  />
                  <ListItemSecondaryAction>
                    <StatusIndicator
                      color={
                        node.isAlive
                          ? StatusIndicatorColor.GREEN
                          : StatusIndicatorColor.RED
                      }
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        </Paper>

        {selectedNodeInfo ? (
          <>
            <div className={classes.grow} />
            <div className={classes.bottomContainer}>
              <Button fullWidth onClick={this.handleOpenFullNodeConfigModal}>
                Show Full Configuration
              </Button>
            </div>

            <ModalConfigGet
              isOpen={showFullNodeConfigModal}
              onClose={this.handleCloseFullNodeConfigModal}
              networkConfig={networkConfig}
              networkName={networkName}
              nodeInfo={selectedNodeInfo || {}}
            />
          </>
        ) : null}
      </>
    );
  };

  renderE2eSidebar = () => {
    // Render the left sidebar for controller/aggregator config
    const {classes, useRawJsonEditor, onSetConfigBase} = this.props;

    const inputs = useRawJsonEditor
      ? []
      : [
          {
            func: createSelectInput,
            label: 'Base Fields',
            value: 'useMetadataBase',
            menuItems: e2eConfigBaseOptions.map(({label, value}) => (
              <MenuItem key={label} value={value}>
                {label}
              </MenuItem>
            )),
            onChange: onSetConfigBase,
          },
        ];

    return (
      <div className={classes.sidePad}>
        {inputs.map(input =>
          input.func({...input}, this.state, this.setState.bind(this)),
        )}
      </div>
    );
  };

  render() {
    const {classes, editMode, onChangeEditorType} = this.props;

    // Common inputs
    const inputs = [
      {
        func: createSelectInput,
        label: 'Editor',
        value: 'useRawJsonEditor',
        menuItems: editorOptions.map(({label, value}) => (
          <MenuItem key={label} value={value}>
            {label}
          </MenuItem>
        )),
        onChange: onChangeEditorType,
      },
    ];

    return (
      <>
        <div className={classes.header}>
          <Typography variant="h6">Configuration Options</Typography>
        </div>
        <div className={classes.sidePad}>
          {inputs.map(input =>
            input.func({...input}, this.state, this.setState.bind(this)),
          )}
        </div>
        {editMode === NetworkConfigMode.NETWORK
          ? this.renderNetworkSidebar()
          : editMode === NetworkConfigMode.NODE
          ? this.renderNodeSidebar()
          : this.renderE2eSidebar()}
      </>
    );
  }
}

export default withStyles(styles)(withRouter(ConfigSidebar));
