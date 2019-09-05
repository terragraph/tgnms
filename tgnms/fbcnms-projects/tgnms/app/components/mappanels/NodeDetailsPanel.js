/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CustomExpansionPanel from '../common/CustomExpansionPanel';
import DeleteIcon from '@material-ui/icons/Delete';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import React from 'react';
import RefreshIcon from '@material-ui/icons/Refresh';
import RouterIcon from '@material-ui/icons/Router';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import SyncIcon from '@material-ui/icons/Sync';
import TimerIcon from '@material-ui/icons/Timer';
import Typography from '@material-ui/core/Typography';
import moment from 'moment';
import {
  LinkTypeValueMap as LinkType,
  NodeTypeValueMap as NodeType,
  PolarityTypeValueMap as PolarityType,
} from '../../../shared/types/Topology';
import {SELECTED_NODE_QUERY_PARAM} from '../../constants/ConfigConstants';
import {SiteOverlayColors} from '../../constants/LayerConstants';
import {apiServiceRequestWithConfirmation} from '../../apiutils/ServiceAPIUtil';
import {
  createActionsMenu,
  getEditIcon,
  getLinkIcon,
  getNodeIcon,
  getSearchNearbyIcon,
  getShowRoutesIcon,
  getSiteIcon,
} from '../../helpers/MapPanelHelpers';
import {formatNumber} from '../../helpers/StringHelpers';
import {getNodePolarities} from '../../helpers/TgFeatures';
import {
  hasNodeEverGoneOnline,
  isNodeAlive,
  renderAvailabilityWithColor,
  renderStatusWithColor,
} from '../../helpers/NetworkHelpers';
import {objectEntriesTypesafe} from '../../helpers/ObjectHelpers';
import {setUrlSearchParam} from '../../helpers/NetworkTestHelpers';
import {shortenVersionString} from '../../helpers/VersionHelper';
import {supportsTopologyScan} from '../../helpers/TgFeatures';
import {withForwardRef} from '@fbcnms/ui/components/ForwardRef';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

import type {
  BgpInfo,
  BgpRouteInfo,
  BgpStatusMap,
  StatusReportType,
} from '../../../shared/types/Controller';
import type {ContextRouter} from 'react-router-dom';
import type {EditNodeParams, NearbyNodes, Routes} from './MapPanelTypes';
import type {ForwardRef} from '@fbcnms/ui/components/ForwardRef';
import type {
  LinkType as Link,
  NodeType as Node,
  TopologyType,
} from '../../../shared/types/Topology';
import type {NetworkConfig, NetworkHealth} from '../../NetworkContext';
import type {Theme, WithStyles} from '@material-ui/core/styles';

const styles = (theme: Theme) => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(1),
  },
  listItemIcon: {
    marginRight: theme.spacing(1),
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
  wrapped: {
    overlayWrap: 'break-word',
    wordBreak: 'break-word',
  },
  indented: {
    marginLeft: theme.spacing(1),
    overlayWrap: 'break-word',
    wordBreak: 'break-all',
  },
  sectionHeading: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: theme.palette.grey[700],
    paddingTop: theme.spacing(1),
  },
  bgpEntryWrapper: {
    paddingTop: 4,
  },
  bgpRouteListItem: {
    padding: '4px 0 2px 16px',
  },
});

const POLARITY_UI = {
  [PolarityType.ODD]: {
    color: SiteOverlayColors.polarity.odd.color,
    text: 'Odd',
  },
  [PolarityType.EVEN]: {
    color: SiteOverlayColors.polarity.even.color,
    text: 'Even',
  },
  [PolarityType.HYBRID_ODD]: {
    color: SiteOverlayColors.polarity.hybrid_odd.color,
    text: 'Hybrid Odd',
  },
  [PolarityType.HYBRID_EVEN]: {
    color: SiteOverlayColors.polarity.hybrid_even.color,
    text: 'Hybrid Even',
  },
  unknown: {
    color: SiteOverlayColors.polarity.unknown.color,
    text: 'Unknown',
  },
};

type Props = {
  networkName: string,
  topology: TopologyType,
  networkConfig: NetworkConfig,
  ctrlVersion: string,
  nearbyNodes: NearbyNodes,
  statusReport?: ?StatusReportType,
  onUpdateNearbyNodes: NearbyNodes => any,
  onClose: () => any,
  networkNodeHealth: NetworkHealth,
  onEdit: EditNodeParams => any,
  onSelectLink: string => any,
  onSelectSite: string => any,
  expanded: boolean,
  pinned: boolean,
  onPanelChange: () => any,
  onPin: () => any,
  ...ContextRouter,
  /*
   * There are major issues with usages of the Routes type. For now, we must
   * override the type of node by removing the nullable node property and
   * specifying a non-nullable one below.
   */
  ...$Diff<Routes, {node: ?Node}>,
  node: Node,
} & WithStyles<typeof styles> &
  ForwardRef;
type State = {};

class NodeDetailsPanel extends React.Component<Props, State> {
  state = {};

  getNodeLinks(
    node: Node,
    links: Array<Link>,
    linkType: $Values<typeof LinkType>,
  ) {
    // Find all wireless links associated with this node
    return links.filter(
      link =>
        link.link_type === linkType &&
        (link.a_node_name === node.name || link.z_node_name === node.name),
    );
  }

  getAvailability(node: Node, networkNodeHealth: NetworkHealth) {
    // Get node availability percentage
    const nodeHealth = networkNodeHealth.events || {};

    let alivePerc = 0;
    if (nodeHealth.hasOwnProperty(node.name)) {
      alivePerc = nodeHealth[node.name].linkAlive;
    }
    return alivePerc;
  }

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

  onRestartMinion = () => {
    // Reboot this node
    const {node, networkName} = this.props;
    const data = {nodes: [node.name], secondsToRestart: 2};
    apiServiceRequestWithConfirmation(networkName, 'restartMinion', data, {
      desc: `Do you want to restart minion on node <strong>${
        node.name
      }</strong>?`,
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

  onShowRoutesToPop = () => {
    // Show Routes from this node
    // $FlowFixMe figure out if we can change this to a node
    const {node, onUpdateRoutes} = this.props;
    onUpdateRoutes({
      node: node.name,
      links: {},
      nodes: new Set(),
    });
  };

  renderActions() {
    // Render actions
    const {ctrlVersion, history, networkName, node} = this.props;
    const actionItems = [
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
          ...(supportsTopologyScan(ctrlVersion)
            ? [
                {
                  label: 'Search Nearby',
                  icon: getSearchNearbyIcon(),
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
            func: () =>
              history.push({
                pathname: '/node_config/' + networkName,
                search: `?${SELECTED_NODE_QUERY_PARAM}=${node.name}`,
              }),
          },
          {
            label: 'Show Routes',
            icon: getShowRoutesIcon(),
            func: this.onShowRoutesToPop,
          },
          {
            label: 'Edit Node',
            icon: getEditIcon(),
            func: this.onEditNode,
          },
          {
            label: 'Delete Node',
            icon: <DeleteIcon />,
            func: this.onDeleteNode,
          },
        ],
      },
      {
        heading: 'Tests',
        actions: [
          {
            label: 'Speed Test',
            icon: <TimerIcon />,
            func: () => setUrlSearchParam(this.props.history, 'speedTest', ''),
          },
        ],
      },
    ];

    return (
      <>
        <Divider />
        {createActionsMenu({actionItems}, this.state, this.setState.bind(this))}
      </>
    );
  }

  renderNodeLinksAndSite() {
    // Render node links and site
    const {classes, node, topology, onSelectLink, onSelectSite} = this.props;
    const nodeLinks = this.getNodeLinks(
      node,
      topology.links,
      LinkType.WIRELESS,
    );

    return (
      <>
        <div className={classes.sectionSpacer} />
        <Divider />

        <List component="nav">
          {nodeLinks.map(link => (
            <ListItem
              button
              dense
              key={link.name}
              onClick={() => onSelectLink(link.name)}>
              <ListItemIcon classes={{root: classes.listItemIcon}}>
                {getLinkIcon()}
              </ListItemIcon>
              <ListItemText
                classes={{root: classes.wrapped}}
                primary={link.name}
                primaryTypographyProps={{variant: 'subtitle2'}}
                secondary={link.is_backup_cn_link ? 'Backup CN Link' : null}
              />
              <ListItemSecondaryAction>
                <StatusIndicator
                  color={
                    link.is_alive
                      ? StatusIndicatorColor.GREEN
                      : StatusIndicatorColor.RED
                  }
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}

          <ListItem button dense onClick={() => onSelectSite(node.site_name)}>
            <ListItemIcon classes={{root: classes.listItemIcon}}>
              {getSiteIcon()}
            </ListItemIcon>
            <ListItemText
              classes={{root: classes.wrapped}}
              primary={node.site_name}
              primaryTypographyProps={{variant: 'subtitle2'}}
            />
          </ListItem>
        </List>
      </>
    );
  }

  renderBgpStatus(bgpStatus: BgpStatusMap) {
    // Render BGP neighbor status
    const {classes} = this.props;
    return (
      <>
        <Typography variant="subtitle2" className={classes.sectionHeading}>
          BGP Neighbors
        </Typography>
        {objectEntriesTypesafe<string, BgpInfo>(bgpStatus).map(([ip, info]) => (
          <div key={ip} className={classes.bgpEntryWrapper}>
            <Typography variant="subtitle2">{ip}</Typography>
            <div className={classes.indented}>
              <div className={classes.spaceBetween}>
                <Typography variant="body2">Status</Typography>
                <Typography variant="body2">
                  {renderStatusWithColor(
                    info.online,
                    'Established',
                    'Disconnected',
                  )}
                </Typography>
              </div>
              <div className={classes.spaceBetween}>
                <Typography variant="body2">ASN</Typography>
                <Typography variant="body2">{info.asn}</Typography>
              </div>
              <div className={classes.spaceBetween}>
                <Typography variant="body2">
                  {info.online ? 'Uptime' : 'Downtime'}
                </Typography>
                <Typography variant="body2">{info.upDownTime}</Typography>
              </div>
              <div className={classes.spaceBetween}>
                <Typography variant="body2">
                  {isNaN(info.stateOrPfxRcd) ? 'State' : 'Received Prefixes'}
                </Typography>
                <Typography variant="body2">{info.stateOrPfxRcd}</Typography>
              </div>

              {info.advertisedRoutes.length
                ? this.renderBgpRoutes(
                    info.advertisedRoutes,
                    'Advertised Routes',
                  )
                : null}
              {info.receivedRoutes.length
                ? this.renderBgpRoutes(info.receivedRoutes, 'Received Routes')
                : null}
            </div>
          </div>
        ))}
      </>
    );
  }

  renderBgpRoutes(routes: Array<BgpRouteInfo>, title) {
    // Render the routes list for a BGP neighbor
    const {classes} = this.props;

    return (
      <>
        <div className={classes.spaceBetween}>
          <Typography variant="body2">{title}</Typography>
          <Typography variant="body2">{formatNumber(routes.length)}</Typography>
        </div>
        <List dense disablePadding>
          {routes.map(({network, nextHop}) => (
            <ListItem key={network} classes={{root: classes.bgpRouteListItem}}>
              <ListItemText
                primary={network}
                primaryTypographyProps={{variant: 'subtitle2'}}
                secondary={'\u2192 ' + nextHop}
              />
            </ListItem>
          ))}
        </List>
      </>
    );
  }

  renderSoftwareVersion(version: string) {
    // Render the node's software version
    const {classes} = this.props;

    return (
      <>
        <Typography variant="subtitle2" className={classes.sectionHeading}>
          Software Version
        </Typography>
        <Typography gutterBottom variant="body2">
          <em>{shortenVersionString(version)}</em>
        </Typography>
      </>
    );
  }

  renderDetails() {
    // Render details
    const {
      classes,
      node,
      statusReport,
      networkNodeHealth,
      networkConfig,
    } = this.props;
    const availability = this.getAvailability(node, networkNodeHealth);

    // Combine some node properties in one string
    let nodeType =
      Object.keys(NodeType).find(key => NodeType[key] === node.node_type) ||
      'unknown';
    const nodeProperties = [];
    if (node.node_type === NodeType.DN) {
      nodeProperties.push(node.is_primary ? 'primary' : 'secondary');
    }
    if (node.pop_node) {
      nodeProperties.push('PoP');
    }
    if (nodeProperties.length > 0) {
      nodeType += ' (' + nodeProperties.join(', ') + ')';
    }

    return (
      <>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Status</Typography>
          <Typography variant="body2">
            {renderStatusWithColor(
              isNodeAlive(node.status),
              undefined,
              hasNodeEverGoneOnline(node, networkConfig.offline_whitelist)
                ? undefined
                : 'Offline (never seen)',
            )}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Node MAC</Typography>
          <Typography variant="body2">{node.mac_addr || 'none'}</Typography>
        </div>
        {node.hasOwnProperty('wlan_mac_addrs') && node.wlan_mac_addrs.length ? (
          <>
            {node.wlan_mac_addrs.map((mac, index) => (
              <div key={mac} className={classes.spaceBetween}>
                <Typography variant="subtitle2">
                  {index === 0 ? 'Radio MACs' : ''}
                </Typography>
                <Typography variant="body2">{mac}</Typography>
              </div>
            ))}
          </>
        ) : null}
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">IPv6</Typography>
          <Typography variant="body2">
            {statusReport ? statusReport.ipv6Address : 'none'}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Node Type</Typography>
          <Typography variant="body2">{nodeType}</Typography>
        </div>
        {node.ant_azimuth > 0.0 ? (
          <div className={classes.spaceBetween}>
            <Typography variant="subtitle2">Azimuth</Typography>
            <Typography variant="body2">
              {formatNumber(node.ant_azimuth)}&deg;
            </Typography>
          </div>
        ) : null}
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Last Reported</Typography>
          <Typography variant="body2">
            {statusReport
              ? moment(new Date(statusReport.timeStamp * 1000)).fromNow()
              : 'n/a'}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Availability</Typography>
          <Typography variant="body2">
            {renderAvailabilityWithColor(formatNumber(availability))}
          </Typography>
        </div>
        {this.renderPolarity()}
        {this.renderEthernetLinks()}
        {statusReport && statusReport.version
          ? this.renderSoftwareVersion(statusReport.version)
          : null}

        {statusReport && statusReport.bgpStatus
          ? this.renderBgpStatus(statusReport.bgpStatus)
          : null}

        {this.renderNodeLinksAndSite()}
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
    const {classes, expanded, onPanelChange, onClose, onPin, node} = this.props;

    return (
      <CustomExpansionPanel
        title={node.name}
        titleIcon={getNodeIcon({classes: {root: classes.iconCentered}})}
        details={this.renderPanel()}
        expanded={expanded}
        onChange={onPanelChange}
        onClose={onClose}
        onPin={onPin}
        pinned={this.props.pinned}
        showLoadingBar={true}
        showTitleCopyTooltip={true}
        fwdRef={this.props.fwdRef}
      />
    );
  }

  renderPolarity = () => {
    const {ctrlVersion, classes, node, networkConfig} = this.props;
    const mac2Polarity = getNodePolarities(
      ctrlVersion,
      node,
      networkConfig.topologyConfig,
    );

    const macAddresses = Object.keys(mac2Polarity);
    if (macAddresses.length < 1) {
      return null;
    }
    return (
      <div>
        <Typography variant="subtitle2">Polarity</Typography>
        <div className={classes.indented}>
          {macAddresses.map(macAddr => {
            const polarity = mac2Polarity[macAddr];
            const {color, text} = POLARITY_UI[polarity]
              ? POLARITY_UI[polarity]
              : POLARITY_UI.unknown;
            return (
              <div className={classes.spaceBetween} key={macAddr}>
                <Typography variant="body2">{macAddr}</Typography>
                <Typography variant="body2">
                  <span style={{color: color}}>{text}</span>
                </Typography>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  renderEthernetLinks = () => {
    const {classes, node, topology} = this.props;
    const nodeLinks = this.getNodeLinks(
      node,
      topology.links,
      LinkType.ETHERNET,
    );
    if (nodeLinks.length < 1) {
      return null;
    }
    return (
      <div>
        <Typography variant="subtitle2">Ethernet Links</Typography>
        <div className={classes.indented}>
          {nodeLinks.map(link => {
            const {color, text} = link.is_alive
              ? {color: 'green', text: 'Online'}
              : {color: 'red', text: 'Offline'};
            const remoteNodeName =
              node.name == link.a_node_name
                ? link.z_node_name
                : link.a_node_name;
            return (
              <div
                className={classes.spaceBetween}
                key={link.name}
                data-testid={remoteNodeName}>
                <Typography variant="body2">{remoteNodeName}</Typography>
                <Typography variant="body2">
                  <span style={{color: color}}>{text}</span>
                </Typography>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
}

export default withForwardRef(withStyles(styles)(withRouter(NodeDetailsPanel)));
