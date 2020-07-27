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
import NearMeIcon from '@material-ui/icons/NearMe';
import NodeDetails from './NodeDetails';
import React from 'react';
import RefreshIcon from '@material-ui/icons/Refresh';
import RouterIcon from '@material-ui/icons/Router';
import SyncIcon from '@material-ui/icons/Sync';
import TaskBasedConfigModal from '../../../views/config/TaskBasedConfigModal';
import TimelineIcon from '@material-ui/icons/Timeline';
import TimerIcon from '@material-ui/icons/Timer';
import {MAPMODE} from '../../../contexts/MapContext';
import {SELECTED_NODE_QUERY_PARAM} from '../../../constants/ConfigConstants';
import {apiServiceRequestWithConfirmation} from '../../../apiutils/ServiceAPIUtil';
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
    const {nodeDetailsProps, history, networkName, node} = props;

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
              : () =>
                  history.push({
                    pathname: '/network_config/' + networkName,
                    search: `?${SELECTED_NODE_QUERY_PARAM}=${node.name}`,
                  }),
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
      ...(isFeatureEnabled('NETWORK_TEST_ENABLED')
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
        />
      </>
    );
  }
}

export default withForwardRef(withStyles(styles)(withRouter(NodeDetailsPanel)));
