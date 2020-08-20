/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as testApi from '../../../apiutils/NetworkTestAPIUtil';
import ActionsMenu from '../ActionsMenu';
import CustomAccordion from '../../common/CustomAccordion';
import DeleteIcon from '@material-ui/icons/Delete';
import Divider from '@material-ui/core/Divider';
import EditIcon from '@material-ui/icons/Edit';
import GetAppIcon from '@material-ui/icons/GetApp';
import NearMeIcon from '@material-ui/icons/NearMe';
import NodeDetails from './NodeDetails';
import React from 'react';
import RefreshIcon from '@material-ui/icons/Refresh';
import RouterIcon from '@material-ui/icons/Router';
import SyncIcon from '@material-ui/icons/Sync';
import TaskBasedConfigModal from '../../../views/config/TaskBasedConfigModal';
import TimelineIcon from '@material-ui/icons/Timeline';
import TimerIcon from '@material-ui/icons/Timer';
import swal from 'sweetalert2';
import {MAPMODE} from '../../../contexts/MapContext';
import {SELECTED_NODE_QUERY_PARAM} from '../../../constants/ConfigConstants';
import {
  SYSDUMP_PATH,
  SYSDUMP_RESULT,
  sysdumpExists,
} from '../../../apiutils/SysdumpAPIUtil';
import {
  apiServiceRequest,
  apiServiceRequestWithConfirmation,
  requestWithConfirmation,
} from '../../../apiutils/ServiceAPIUtil';
import {createTestMapLink} from '../../../helpers/NetworkTestHelpers';
import {isFeatureEnabled} from '../../../constants/FeatureFlags';
import {supportsTopologyScan} from '../../../helpers/TgFeatures';
import {withForwardRef} from '@fbcnms/ui/components/ForwardRef';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

import type {ContextRouter} from 'react-router-dom';
import type {EditNodeParams, NearbyNodes} from '../MapPanelTypes';
import type {ForwardRef} from '@fbcnms/ui/components/ForwardRef';
import type {Props as NodeDetailsProps} from './NodeDetails';
import type {NodeType} from '../../../../shared/types/Topology';
import type {RoutesContext as Routes} from '../../../contexts/RouteContext';
import type {Theme, WithStyles} from '@material-ui/core/styles';

const styles = (theme: Theme) => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(1),
  },
});

type Props = {
  nodeDetailsProps: NodeDetailsProps,
  networkName: string,
  nearbyNodes: NearbyNodes,
  onUpdateNearbyNodes: NearbyNodes => any,
  onClose: () => any,
  onEdit: EditNodeParams => any,
  expanded: boolean,
  pinned: boolean,
  onPanelChange: () => any,
  onPin: () => any,
  ...ContextRouter,
  ...Routes,
  node: NodeType,
} & WithStyles<typeof styles> &
  ForwardRef;

type State = {configModalOpen: boolean};

class NodeDetailsPanel extends React.Component<Props, State> {
  state = {configModalOpen: false};
  actionItems;

  constructor(props) {
    super(props);
    const {nodeDetailsProps} = props;

    this.actionItems = [
      {
        heading: 'Commands',
        actions: [
          {
            label: 'Reboot Node',
            icon: <RefreshIcon />,
            func: this.onRebootNode,
          },
          {
            label: 'Restart Minion',
            icon: <SyncIcon />,
            func: this.onRestartMinion,
          },
          ...(isFeatureEnabled('GET_SYSDUMP_ENABLED')
            ? [
                {
                  label: 'Get Sysdump',
                  icon: <GetAppIcon />,
                  func: this.onGetSysdump,
                },
              ]
            : []),
          ...(supportsTopologyScan(nodeDetailsProps.ctrlVersion)
            ? [
                {
                  label: 'Search Nearby',
                  icon: <NearMeIcon />,
                  func: this.onSearchNearby,
                },
              ]
            : []),
        ],
      },
      {
        heading: 'Topology',
        actions: [
          {
            label: 'Node Configuration',
            icon: <RouterIcon />,
            func: isFeatureEnabled('TASK_BASED_CONFIG_ENABLED')
              ? this.onEditNodeConfig
              : this.handleToConfigTable,
          },
          {
            label: 'Edit Node',
            icon: <EditIcon />,
            func: this.onEditNode,
          },
          {
            label: 'Delete Node',
            icon: <DeleteIcon />,
            func: this.onDeleteNode,
          },
        ],
      },
      ...(isFeatureEnabled('DEFAULT_ROUTES_HISTORY_ENABLED')
        ? [
            {
              heading: 'Troubleshooting',
              actions: [
                {
                  label: 'Show Routes',
                  icon: <TimelineIcon />,
                  func: this.onShowRoutes,
                },
              ],
            },
          ]
        : []),
      ...(isFeatureEnabled('NETWORKTEST_ENABLED')
        ? [
            {
              heading: 'Tests',
              actions: [
                {
                  label: 'Start Throughput Test',
                  icon: <TimerIcon />,
                  func: this.onStartThroughputTest,
                },
              ],
            },
          ]
        : []),
    ];
  }

  handleToConfigTable = () => {
    const {history, networkName, node} = this.props;

    history.push({
      pathname: '/network_config/' + networkName,
      search: `?${SELECTED_NODE_QUERY_PARAM}=${node.name}`,
    });
  };
  onStartThroughputTest = () => {
    const {networkName, node, history} = this.props;
    testApi
      .startThroughputTest({
        networkName: networkName,
        whitelist: [node.name],
      })
      .then(response => {
        if (!response) {
          throw new Error(response.data.msg);
        }
        const id = response.data.split(' ').pop();
        const url = new URL(
          createTestMapLink({
            executionId: id,
            networkName,
          }),
          window.location.origin,
        );
        url.search = location.search;
        if (id) {
          url.searchParams.set('test', id);
          url.searchParams.set('mapMode', MAPMODE.NETWORK_TEST);
        }
        // can't use an absolute url in react-router
        history.push(`${url.pathname}${url.search}`);
      });
  };

  onRebootNode = () => {
    // Reboot this node
    const {node, networkName} = this.props;
    const data = {nodes: [node.name], secondsToReboot: 5};
    apiServiceRequestWithConfirmation(networkName, 'rebootNode', data, {
      desc: `Do you want to reboot node <strong>${node.name}</strong>?`,
      descType: 'html',
      checkbox: 'Force reboot (even if upgrading or testcoding)',
      processInput: (data, value) => {
        return {...data, force: !!value};
      },
    });
  };

  onEditNodeConfig = () => {
    this.setState({configModalOpen: true});
  };

  handleConfigModalClose = () => {
    this.setState({configModalOpen: false});
  };

  onRestartMinion = () => {
    // Reboot this node
    const {node, networkName} = this.props;
    const data = {nodes: [node.name], secondsToRestart: 2};
    apiServiceRequestWithConfirmation(networkName, 'restartMinion', data, {
      desc:
        `Do you want to restart minion on node <strong>` +
        `${node.name}</strong>?`,
      descType: 'html',
    });
  };

  onSearchNearby = () => {
    // Show the "Search Nearby" panel
    const {node, nearbyNodes, onUpdateNearbyNodes} = this.props;
    if (!nearbyNodes.hasOwnProperty(node.name)) {
      onUpdateNearbyNodes({...nearbyNodes, [node.name]: null});
    }
  };

  onGetSysdump = async () => {
    // Request a sysdump from this node
    const {node, networkName} = this.props;
    const data = {node: node.name};
    let filename = '';

    const makeRequest = requestData =>
      apiServiceRequest(networkName, 'getSysdump', requestData)
        .then(response => {
          return {
            success: true,
            msg: response.data.filename,
          };
        })
        .catch(error => {
          return {success: false, msg: error.response.data.error};
        });
    await requestWithConfirmation(
      makeRequest,
      {
        desc: `Do you want to request a sysdump from node <strong>${node.name}</strong>?`,
        descType: 'html',
        onResultsOverride: params => {
          const {success, msg} = params;
          if (success) {
            filename = msg;
            swal({
              title: 'Success!',
              html: `Sysdump requested. Uploading <strong>${msg}</strong> to the fileserver.`,
              type: 'success',
            });
          } else {
            swal({
              title: 'Failed!',
              html: `${msg}`,
              type: 'error',
            });
          }
        },
      },
      data,
    );

    let result = {};
    while (true) {
      await new Promise(res => setTimeout(res, 5000));
      result = await sysdumpExists(filename);
      if (
        result === SYSDUMP_RESULT.SUCCESS ||
        result === SYSDUMP_RESULT.ERROR
      ) {
        break;
      }
    }

    if (result === SYSDUMP_RESULT.SUCCESS) {
      swal({
        title: 'Success!',
        html: `Sysdump available <a href=${`${SYSDUMP_PATH}/download/${filename}`}>here</a>`,
        type: 'success',
      });
    } else if (result === SYSDUMP_RESULT.ERROR) {
      swal({
        title: 'Error!',
        html: `Encountered an error while polling for sysdump: ${filename}`,
        type: 'error',
      });
    }
  };

  onDeleteNode = () => {
    // Delete this node
    const {node, networkName} = this.props;
    const data = {nodeName: node.name};
    apiServiceRequestWithConfirmation(networkName, 'delNode', data, {
      desc: `Do you want to permanently delete node
      <strong>${node.name}</strong>?`,
      descType: 'html',
      checkbox: 'Force node deletion (even if alive)',
      processInput: (data, value) => {
        return {...data, force: !!value};
      },
    });
  };

  onEditNode = () => {
    // Edit this node
    const {onClose, onEdit} = this.props;
    const {wlan_mac_addrs, ...node} = this.props.node;
    const params: EditNodeParams = {
      ...node,
      ...(node.golay_idx || {txGolayIdx: null, rxGolayIdx: null}),
      wlan_mac_addrs: wlan_mac_addrs ? wlan_mac_addrs.join(',') : '',
    };
    // Format the data according to AddNodePanel state structure
    // (Not all parameters are editable, but send them all anyway)
    onEdit(params);
    onClose();
  };

  onShowRoutes = () => {
    // Show Routes from this node
    const {node, onUpdateRoutes} = this.props;
    onUpdateRoutes({
      node: node.name,
      links: {},
      nodes: new Set(),
    });
  };

  render() {
    const {
      classes,
      expanded,
      onPanelChange,
      onClose,
      onPin,
      node,
      nodeDetailsProps,
    } = this.props;
    const {configModalOpen} = this.state;

    const actionItems = this.actionItems;

    return (
      <>
        <CustomAccordion
          title={node.name}
          titleIcon={<RouterIcon classes={{root: classes.iconCentered}} />}
          details={
            <div style={{width: '100%'}}>
              <NodeDetails {...nodeDetailsProps} node={node} />
              <Divider />
              <ActionsMenu options={{actionItems}} />
            </div>
          }
          expanded={expanded}
          onChange={onPanelChange}
          onClose={onClose}
          onPin={onPin}
          pinned={this.props.pinned}
          showLoadingBar={true}
          showTitleCopyTooltip={true}
          fwdRef={this.props.fwdRef}
        />
        <TaskBasedConfigModal
          open={configModalOpen}
          modalTitle="Node Config"
          onClose={this.handleConfigModalClose}
          onAdvancedLinkClick={this.handleToConfigTable}
        />
      </>
    );
  }
}

export default withForwardRef(withStyles(styles)(withRouter(NodeDetailsPanel)));
