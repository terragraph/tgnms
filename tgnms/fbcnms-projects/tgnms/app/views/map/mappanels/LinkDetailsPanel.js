/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ActionsMenu from './ActionsMenu/ActionsMenu';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import RouterIcon from '@material-ui/icons/Router';
import StatusIndicator, {
  StatusIndicatorColor,
} from '@fbcnms/tg-nms/app/components/common/StatusIndicator';
import StatusText from '@fbcnms/tg-nms/app/components/common/StatusText';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {LinkActionTypeValueMap as LinkActionType} from '@fbcnms/tg-nms/shared/types/Controller';
import {
  LinkTypeValueMap as LinkType,
  NodeTypeValueMap,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {STATS_LINK_QUERY_PARAM} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {TEST_TYPE_CODES} from '@fbcnms/tg-nms/app/constants/ScheduleConstants';
import {
  apiServiceRequestWithConfirmation,
  requestWithConfirmation,
} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {
  convertType,
  objectValuesTypesafe,
} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {currentDefaultRouteRequest} from '@fbcnms/tg-nms/app/apiutils/DefaultRouteHistoryAPIUtil';
import {deleteLinkRequest} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {
  formatNumber,
  toTitleCase,
} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {get} from 'lodash';
import {
  hasLinkEverGoneOnline,
  isNodeAlive,
  renderAvailabilityWithColor,
} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {mapDefaultRoutes} from '@fbcnms/tg-nms/app/helpers/DefaultRouteHelpers';
import {startPartialTest} from '@fbcnms/tg-nms/app/features/network_test/NetworkTestHelpers';
import {withForwardRef} from '@fbcnms/ui/components/ForwardRef';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

import type {AzimuthManager} from '@fbcnms/tg-nms/app/features/topology/useAzimuthManager';
import type {ForwardRef} from '@fbcnms/ui/components/ForwardRef';
import type {
  LinkType as Link,
  NodeType as Node,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {
  NetworkHealth,
  NetworkState,
} from '@fbcnms/tg-nms/shared/dto/NetworkState';
import type {RouterHistory} from 'react-router-dom';

const styles = theme => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(1),
  },
  listItemIcon: {
    marginRight: theme.spacing(2),
    minWidth: 'unset',
  },
  sectionSpacer: {
    height: theme.spacing(1),
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
});

type Props = {
  classes: {[string]: string},
  expanded: boolean,
  history: RouterHistory,
  ignitionEnabled: boolean,
  link: Link,
  networkName: string,
  nodeMap: {[string]: Node},
  networkConfig: NetworkState,
  networkLinkHealth: NetworkHealth,
  networkLinkMetrics: {},
  onClose: () => any,
  onPanelChange: () => any,
  onPin: () => any,
  onSelectNode: string => any,
  pinned: boolean,
  topology: TopologyType,
  azimuthManager: AzimuthManager,
} & ForwardRef;

type State = {};

class LinkDetailsPanel extends React.Component<Props, State> {
  state = {};

  getAvailability(link, networkLinkHealth) {
    // Get link availability percentage
    const linkHealth = networkLinkHealth.events || {};

    let alivePerc = 0;
    if (linkHealth.hasOwnProperty(link.name)) {
      alivePerc = linkHealth[link.name].linkAvailForData || NaN;
    }
    return alivePerc;
  }

  onSendSetLinkStatus(action, type) {
    // Send an assoc/dissoc request
    const {link, networkName} = this.props;

    const data = {action};
    apiServiceRequestWithConfirmation(networkName, 'setLinkStatus', data, {
      desc: `Pick the node to initiate this <strong>${type}</strong> request.`,
      descType: 'html',
      choices: {
        [link.a_node_name]: link.a_node_name,
        [link.z_node_name]: link.z_node_name,
      },
      processInput: (data, value) => {
        return {
          ...data,
          initiatorNodeName: value,
          responderNodeName:
            value === link.a_node_name ? link.z_node_name : link.a_node_name,
        };
      },
    });
  }

  onChangeLinkIgnitionState() {
    // Turn automatic ignition for this link on/off
    const {link, networkName} = this.props;

    const data = {};
    apiServiceRequestWithConfirmation(networkName, 'setIgnitionState', data, {
      title: 'Change Ignition State?',
      desc: `Toggle automatic ignition of <strong>${link.name}</strong>:`,
      descType: 'html',
      choices: {
        true: 'Enable Ignition',
        false: 'Disable Ignition',
      },
      processInput: (data, value) => {
        return {
          ...data,
          linkAutoIgnite: {[link.name]: value === 'true'},
        };
      },
    });
  }

  onShowDashboards() {
    // Take user to the dashboard page with pre-populated link
    const {link, history, networkName} = this.props;

    history.push({
      pathname: '/dashboards/' + networkName,
      search: `?${STATS_LINK_QUERY_PARAM}=${link.name}`,
    });
  }

  onDeleteLink() {
    const {nodeMap} = this.props;
    // Delete this link
    const {link, networkName, azimuthManager} = this.props;
    requestWithConfirmation(
      () =>
        deleteLinkRequest({
          nodeMap,
          link,
          networkName,
          azimuthManager,
        }),
      {
        desc: `Do you want to permanently delete <strong>${link.name}</strong>? This will also dissociate the link.`,
        descType: 'html',
        processInput: (data, value) => {
          return {...data, force: !!value};
        },
      },
      {},
    );
  }

  onStartThroughputTest = () => {
    const {networkName, link, history} = this.props;

    startPartialTest({
      networkName,
      allowlist: [link.name],
      history,
      testType: TEST_TYPE_CODES.PARALLEL_LINK,
    });
  };

  getCongestionNodes = async () => {
    const {networkName, link, nodeMap, topology} = this.props;
    const nodeList = objectValuesTypesafe<Node>(nodeMap);
    const cnNames = await Promise.all(
      nodeList
        .filter(node => node.node_type === NodeTypeValueMap.CN)
        .map(async cn => {
          const currentDefaultRoute = await currentDefaultRouteRequest({
            networkName,
            selectedNode: cn.name,
          });
          const {links} = mapDefaultRoutes({
            mapRoutes: currentDefaultRoute,
            topology,
          });
          const linkNames = Object.keys(links);
          if (linkNames.includes(link.name)) {
            return cn.name;
          }
          return null;
        }),
    );

    return convertType<Array<string>>(cnNames).filter(
      nodeName => nodeName !== null,
    );
  };

  onStartCongestionTest = async () => {
    const {networkName, history} = this.props;
    const nodesToTest = await this.getCongestionNodes();

    if (nodesToTest.length > 0) {
      startPartialTest({
        networkName,
        allowlist: [...nodesToTest],
        history,
        testType: TEST_TYPE_CODES.PARALLEL_NODE,
      });
    }
  };

  renderActions() {
    // Render actions
    const {link} = this.props;
    const actionItems = [
      ...(link.link_type === LinkType.WIRELESS
        ? [
            {
              heading: 'Commands',
              actions: [
                {
                  label: 'Send Assoc',
                  func: () =>
                    this.onSendSetLinkStatus(LinkActionType.LINK_UP, 'assoc'),
                },
                {
                  label: 'Send Dissoc',
                  func: () =>
                    this.onSendSetLinkStatus(
                      LinkActionType.LINK_DOWN,
                      'dissoc',
                    ),
                },
                {
                  label: 'Change Ignition State',
                  func: () => this.onChangeLinkIgnitionState(),
                },
              ],
            },
          ]
        : []),
      {
        heading: 'Topology',
        actions: [
          {
            label: 'View in Grafana',
            func: () => this.onShowDashboards(),
          },
          {
            label: 'Delete Link',
            func: () => this.onDeleteLink(),
          },
        ],
      },
      ...(isFeatureEnabled('NETWORKTEST_ENABLED')
        ? [
            {
              heading: 'Tests',
              actions: [
                {
                  label: 'Start Throughput Test',
                  func: this.onStartThroughputTest,
                },
                ,
                {
                  label: 'Start Congestion Test',
                  func: this.onStartCongestionTest,
                },
              ],
            },
          ]
        : []),
    ];

    return (
      <>
        <Divider />
        <ActionsMenu options={{actionItems}} />
      </>
    );
  }

  renderLinkNodes() {
    // Render link nodes
    const {classes, link, nodeMap} = this.props;
    const linkNodes = [
      {node: link.a_node_name, mac: link.a_node_mac},
      {node: link.z_node_name, mac: link.z_node_mac},
    ];

    return (
      <>
        <div className={classes.sectionSpacer} />
        <Divider />

        <List component="nav">
          {linkNodes.map(({node, mac}) => (
            <ListItem
              button
              dense
              key={node}
              onClick={() => this.props.onSelectNode(node)}>
              <ListItemIcon classes={{root: classes.listItemIcon}}>
                {<RouterIcon />}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Tooltip title={node} placement="top">
                    <Typography variant="subtitle2" noWrap={true}>
                      {node}
                    </Typography>
                  </Tooltip>
                }
                secondary={mac || null}
              />
              <ListItemSecondaryAction>
                <StatusIndicator
                  color={
                    isNodeAlive(nodeMap[node].status)
                      ? StatusIndicatorColor.GREEN
                      : StatusIndicatorColor.RED
                  }
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </>
    );
  }

  renderDetails() {
    // Render details
    const {
      classes,
      link,
      networkLinkHealth,
      networkLinkMetrics,
      ignitionEnabled,
      networkConfig,
    } = this.props;
    const availability = this.getAvailability(link, networkLinkHealth);
    const linkAttempts = get(
      networkLinkMetrics,
      ['ignitionAttempts', link.name],
      null,
    );

    const linkType = Object.keys(LinkType).find(
      key => LinkType[key] === link.link_type,
    );
    return (
      <>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Status</Typography>
          <Typography variant="body2">
            <StatusText
              status={link.is_alive}
              falseText={
                hasLinkEverGoneOnline(link, networkConfig.offline_whitelist)
                  ? undefined
                  : 'Offline (never seen)'
              }
            />
          </Typography>
        </div>
        {link.link_type !== LinkType.WIRELESS ? (
          <div className={classes.spaceBetween}>
            <Typography variant="subtitle2">Type</Typography>
            <Typography variant="body2">
              {linkType ? toTitleCase(linkType) : 'unknown'}
            </Typography>
          </div>
        ) : null}
        {link.is_backup_cn_link ? (
          <div className={classes.spaceBetween}>
            <Typography variant="subtitle2">Role</Typography>
            <Typography variant="body2">Backup CN Link</Typography>
          </div>
        ) : null}
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Azimuth</Typography>
          <Typography variant="body2">
            {formatNumber(link._meta_.angle, 1)}&deg;
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Length</Typography>
          <Typography variant="body2">
            {formatNumber(link._meta_.distance, 1)} meters
          </Typography>
        </div>
        {!ignitionEnabled ? (
          <div className={classes.spaceBetween}>
            <Typography variant="subtitle2">Link Ignition</Typography>
            <Typography variant="body2">
              <StatusText
                status={ignitionEnabled}
                trueText="Enabled"
                falseText="Disabled"
              />
            </Typography>
          </div>
        ) : null}
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Ignition Attempts (1d)</Typography>
          <Typography variant="body2">
            {linkAttempts ? formatNumber(Number.parseInt(linkAttempts)) : '-'}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Availability</Typography>
          <Typography variant="body2">
            {renderAvailabilityWithColor(formatNumber(availability))}
          </Typography>
        </div>

        {this.renderLinkNodes()}
      </>
    );
  }

  renderPanel() {
    return (
      <div style={{width: '100%'}}>
        {this.renderDetails()}
        {this.renderActions()}
      </div>
    );
  }

  render() {
    const {
      classes,
      expanded,
      fwdRef,
      onPanelChange,
      onClose,
      onPin,
      pinned,
      link,
    } = this.props;

    return (
      <CustomAccordion
        title={link.name}
        titleIcon={<CompareArrowsIcon classes={{root: classes.iconCentered}} />}
        details={this.renderPanel()}
        expanded={expanded}
        onChange={onPanelChange}
        onClose={onClose}
        onPin={onPin}
        pinned={pinned}
        showLoadingBar={false}
        showTitleCopyTooltip={true}
        fwdRef={fwdRef}
      />
    );
  }
}

export default withForwardRef(withStyles(styles)(withRouter(LinkDetailsPanel)));
