/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as scanApi from '@fbcnms/tg-nms/app/apiutils/ScanServiceAPIUtil';
import ActionsMenu from '../ActionsMenu/ActionsMenu';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Divider from '@material-ui/core/Divider';
import NodeDetails from './NodeDetails';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import TaskBasedConfigModal from '@fbcnms/tg-nms/app/components/taskBasedConfig/TaskBasedConfigModal';
import swal from 'sweetalert2';
import {
  DEFAULT_SCAN_MODE,
  SCAN_MODE,
  SCAN_TYPES,
} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {SELECTED_NODE_QUERY_PARAM} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {
  SYSDUMP_PATH,
  SYSDUMP_RESULT,
  sysdumpExists,
} from '@fbcnms/tg-nms/app/apiutils/SysdumpAPIUtil';
import {TEST_TYPE_CODES} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {
  apiServiceRequest,
  apiServiceRequestWithConfirmation,
  requestWithConfirmation,
} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {currentDefaultRouteRequest} from '@fbcnms/tg-nms/app/apiutils/DefaultRouteHistoryAPIUtil';
import {
  getConfigOverrides,
  getTunnelConfigs,
  getWirelessLinkNames,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {getNodesInRoute} from '@fbcnms/tg-nms/app/helpers/DefaultRouteHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {makeStyles} from '@material-ui/styles';
import {startPartialTest} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestHelpers';
import {supportsTopologyScan} from '@fbcnms/tg-nms/app/helpers/TgFeatures';
import {useHistory} from 'react-router-dom';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';

import type {L2TunnelInputParams} from '@fbcnms/tg-nms/app/views/map/mappanels/L2TunnelInputs';
import type {
  LinkMap,
  NodeToLinksMap,
} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {NearbyNodes} from '@fbcnms/tg-nms/app/features/map/MapPanelTypes';
import type {Props as NodeDetailsProps} from './NodeDetails';
import type {NodeType} from '@fbcnms/tg-nms/shared/types/Topology';
import type {RoutesContext as Routes} from '@fbcnms/tg-nms/app/contexts/RouteContext';

const useStyles = makeStyles(theme => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(1),
  },
}));

type Props = {|
  nodeDetailsProps: NodeDetailsProps,
  networkName: string,
  nearbyNodes: NearbyNodes,
  onUpdateNearbyNodes: NearbyNodes => any,
  onClose: () => any,
  expanded: boolean,
  pinned: boolean,
  onPanelChange: () => any,
  onPin: () => any,
  ...Routes,
  node: NodeType,
  nodeToLinksMap: NodeToLinksMap,
  linkMap: LinkMap,
  snackbars: {
    success: string => any,
    error: string => any,
    warning: string => any,
  },
  onEdit: string => any,
  onEditTunnel: L2TunnelInputParams => any,
|};

type State = {|configModalOpen: boolean|};

export default React.forwardRef<*, *>(function NodeDetailsPanelNew(
  props: Props,
  fwdRef,
) {
  const classes = useStyles();
  const history = useHistory();
  const {
    expanded,
    onPanelChange,
    onClose,
    onPin,
    node,
    nodeDetailsProps,
    linkMap,
    nodeToLinksMap,
  } = props;
  const {networkConfig} = useNetworkContext();
  const [state, setState] = React.useState<State>({configModalOpen: false});
  const {configModalOpen} = state;
  const P2MPLinkNames = getWirelessLinkNames({node, linkMap, nodeToLinksMap});

  const handleToConfigTable = () => {
    const {networkName, node} = props;
    history.push({
      pathname: '/network_config/' + networkName,
      search: `?${SELECTED_NODE_QUERY_PARAM}=${node.name}`,
    });
  };

  const onStartRadioIMScan = mac_addr => {
    const {networkName, snackbars} = props;

    scanApi
      .startExecution({
        networkName: networkName,
        mode: SCAN_MODE[DEFAULT_SCAN_MODE],
        type: SCAN_TYPES['IM'],
        options: {
          tx_wlan_mac: mac_addr,
        },
      })
      .then(_ =>
        snackbars.success(`Successfully started radio scan for ${mac_addr}`),
      )
      .catch(err => snackbars.error('Failed to start scan. ' + err));
  };

  const onStartThroughputTest = () => {
    const {networkName, node} = props;

    startPartialTest({
      networkName,
      allowlist: [node.name],
      history,
      testType: TEST_TYPE_CODES.SEQUENTIAL_NODE,
    });
  };

  const onStartIncrementalRouteTest = async () => {
    const {networkName, node, snackbars} = props;
    try {
      const currentRoute = await currentDefaultRouteRequest({
        networkName,
        selectedNode: node.name,
      });
      if (!currentRoute || currentRoute.length === 0) {
        return snackbars.error(
          'Could not start incremental route test, no route available.',
        );
      }
      startPartialTest({
        networkName,
        allowlist: [...getNodesInRoute({mapRoutes: currentRoute})],
        history,
        testType: TEST_TYPE_CODES.SEQUENTIAL_NODE,
      });
    } catch {
      snackbars.error('Could not start incremental route test.');
    }
  };

  const onStartP2MPTest = () => {
    const {networkName} = props;

    startPartialTest({
      networkName,
      allowlist: P2MPLinkNames,
      history,
      testType: TEST_TYPE_CODES.PARALLEL_LINK,
    });
  };

  const onRebootNode = () => {
    // Reboot this node
    const {node, networkName} = props;
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

  const onEditNodeConfig = () => {
    setState({configModalOpen: true});
  };

  const handleConfigModalClose = () => {
    setState({configModalOpen: false});
  };

  const onRestartMinion = () => {
    // Reboot this node
    const {node, networkName} = props;
    const data = {nodes: [node.name], secondsToRestart: 2};
    apiServiceRequestWithConfirmation(networkName, 'restartMinion', data, {
      desc:
        `Do you want to restart minion on node <strong>` +
        `${node.name}</strong>?`,
      descType: 'html',
    });
  };

  const onSearchNearby = () => {
    // Show the "Search Nearby" panel
    const {node, nearbyNodes, onUpdateNearbyNodes} = props;
    if (!nearbyNodes.hasOwnProperty(node.name)) {
      onUpdateNearbyNodes({...nearbyNodes, [node.name]: null});
    }
  };

  const onGetSysdump = async () => {
    // Request a sysdump from this node
    const {node, networkName} = props;
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
        desc:
          `Do you want to request a sysdump from node` +
          ` <strong>${node.name}</strong>?`,
        descType: 'html',
        onResultsOverride: params => {
          const {success, msg} = params;
          if (success) {
            filename = msg;
            swal({
              title: 'Success!',
              html:
                `Sysdump requested. Uploading ` +
                `<strong>${msg}</strong> to the fileserver.`,
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
      const sysdumpPath = `${SYSDUMP_PATH}/download/${filename}`;
      swal({
        title: 'Success!',
        html: `Sysdump available <a href=${sysdumpPath}>here</a>`,
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

  const onDeleteNode = () => {
    // Delete this node
    const {node, networkName} = props;
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

  const onEditNode = () => {
    // Edit this node
    const {onClose, onEdit, node} = props;
    // (Not all parameters are editable, but send them all anyway)
    onEdit(node.name);
    onClose();
  };

  const onShowRoutes = () => {
    // Show Routes from this node
    const {node, onUpdateRoutes} = props;
    onUpdateRoutes({
      node: node.name,
      links: {},
      nodes: new Set(),
    });
  };
  const tunnelConfigs = React.useMemo(
    () => getTunnelConfigs(getConfigOverrides(networkConfig), node.name),
    [networkConfig, node],
  );

  const _onEditTunnel = tunnelName => {
    const {onEditTunnel} = props;
    onEditTunnel({
      nodeName: node.name,
      tunnelName: tunnelName,
    });
  };

  const actionItems = [
    {
      heading: 'Commands',
      actions: [
        {
          label: 'Reboot Node',
          func: onRebootNode,
        },
        {
          label: 'Restart Minion',
          func: onRestartMinion,
        },
        ...(isFeatureEnabled('GET_SYSDUMP_ENABLED')
          ? [
              {
                label: 'Get Sysdump',
                func: onGetSysdump,
              },
            ]
          : []),
        ...(supportsTopologyScan(nodeDetailsProps.ctrlVersion)
          ? [
              {
                label: 'Search Nearby',
                func: onSearchNearby,
              },
            ]
          : []),
      ],
    },
    {
      heading: 'Topology',
      actions: [
        {
          label: 'Configure Node',
          func: onEditNodeConfig,
          className: STEP_TARGET.NODE_CONFIG,
        },
        {
          label: 'Edit Node',
          func: onEditNode,
        },
        {
          label: 'Delete Node',
          func: onDeleteNode,
        },
        {
          label: 'Edit L2 Tunnel',
          subMenu: [
            {
              actions: tunnelConfigs
                ? Object.keys(tunnelConfigs).map(tunnelName => ({
                    label: tunnelName,
                    func: () => _onEditTunnel(tunnelName),
                  }))
                : [],
            },
          ],
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
                func: onShowRoutes,
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
                func: onStartThroughputTest,
              },
              {
                label: 'Start Incremental Route Test',
                func: onStartIncrementalRouteTest,
              },
              ...(P2MPLinkNames.length > 1
                ? [
                    {
                      label: 'Start P2MP Node Test',
                      func: onStartP2MPTest,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
    {
      heading: 'Scans',
      actions: [
        {
          label: 'Start IM Scan',
          subMenu: [
            {
              actions: node.wlan_mac_addrs.map(mac_addr => ({
                label: mac_addr,
                func: () => onStartRadioIMScan(mac_addr),
              })),
            },
          ],
        },
      ],
    },
  ];
  return (
    <>
      <CustomAccordion
        title={node.name}
        titleIcon={<RouterIcon classes={{root: classes.iconCentered}} />}
        details={
          <div style={{width: '100%'}}>
            <NodeDetails {...nodeDetailsProps} node={node} />
            <Divider />
            <div className={STEP_TARGET.NODE_ACTIONS}>
              <ActionsMenu options={{actionItems}} />
            </div>
          </div>
        }
        expanded={expanded}
        onChange={onPanelChange}
        onClose={onClose}
        onPin={onPin}
        pinned={props.pinned}
        showLoadingBar={false}
        showTitleCopyTooltip={true}
        fwdRef={fwdRef}
      />
      <TaskBasedConfigModal
        open={configModalOpen}
        modalTitle="Node Configuration"
        onClose={handleConfigModalClose}
        onAdvancedLinkClick={handleToConfigTable}
      />
    </>
  );
});
