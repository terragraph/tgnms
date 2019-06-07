/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {apiServiceRequestWithConfirmation} from '../../apiutils/ServiceAPIUtil';
import {
  createActionsMenu,
  getEditIcon,
  getLinkIcon,
  getNodeIcon,
  getSearchNearbyIcon,
  getSiteIcon,
  getShowRoutesIcon,
} from '../../helpers/MapPanelHelpers';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import DeleteIcon from '@material-ui/icons/Delete';
import Divider from '@material-ui/core/Divider';
import {formatNumber} from '../../helpers/StringHelpers';
import {
  isNodeAlive,
  renderAvailabilityWithColor,
  renderStatusWithColor,
  hasNodeEverGoneOnline,
} from '../../helpers/NetworkHelpers';
import {LinkType, NodeType} from '../../../thrift/gen-nodejs/Topology_types';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import RefreshIcon from '@material-ui/icons/Refresh';
import SyncIcon from '@material-ui/icons/Sync';
import RouterIcon from '@material-ui/icons/Router';
import {SELECTED_NODE_QUERY_PARAM} from '../../constants/ConfigConstants';
import {shortenVersionString} from '../../helpers/VersionHelper';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import {supportsTopologyScan} from '../../helpers/TgFeatures';
import Typography from '@material-ui/core/Typography';
import {withRouter} from 'react-router-dom';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing.unit,
  },
  listItemIcon: {
    marginRight: 0,
  },
  sectionSpacer: {
    height: theme.spacing.unit,
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  indented: {
    marginLeft: theme.spacing.unit,
    wordWrap: 'break-word',
    wordBreak: 'break-all',
  },
  sectionHeading: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: theme.palette.grey[700],
    paddingTop: theme.spacing.unit,
  },
  bgpEntryWrapper: {
    paddingTop: 4,
  },
  bgpRouteListItem: {
    padding: '4px 0 2px 16px',
  },
});

class NodeDetailsPanel extends React.Component {
  state = {};

  getNodeLinks(node, links) {
    // Find all wireless links associated with this node
    return links.filter(
      link =>
        link.link_type === LinkType.WIRELESS &&
        (link.a_node_name === node.name || link.z_node_name === node.name),
    );
  }

  getAvailability(node, networkNodeHealth) {
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
    const {node, onClose, onEdit} = this.props;

    // Format the data according to AddNodePanel state structure
    // (Not all parameters are editable, but send them all anyway)
    onEdit({
      ...node,
      ...(node.golay_idx || {txGolayIdx: null, rxGolayIdx: null}),
      wlan_mac_addrs: node.wlan_mac_addrs ? node.wlan_mac_addrs.join(',') : '',
    });
    onClose();
  };

  onShowRoutesToPop = () => {
    // Show Routes from this node
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
    const {classes, node, topology} = this.props;
    const nodeLinks = this.getNodeLinks(node, topology.links);

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
              onClick={() => this.props.onSelectLink(link.name)}>
              <ListItemIcon classes={{root: classes.listItemIcon}}>
                {getLinkIcon()}
              </ListItemIcon>
              <ListItemText
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

          <ListItem
            button
            dense
            onClick={() => this.props.onSelectSite(node.site_name)}>
            <ListItemIcon classes={{root: classes.listItemIcon}}>
              {getSiteIcon()}
            </ListItemIcon>
            <ListItemText
              primary={node.site_name}
              primaryTypographyProps={{variant: 'subtitle2'}}
            />
          </ListItem>
        </List>
      </>
    );
  }

  renderBgpStatus(bgpStatus) {
    // Render BGP neighbor status
    const {classes} = this.props;
    return (
      <>
        <Typography variant="subtitle2" className={classes.sectionHeading}>
          BGP Neighbors
        </Typography>

        {Object.entries(bgpStatus).map(([ip, info]) => (
          <div key={ip} className={classes.bgpEntryWrapper}>
            <Typography variant="subtitle2">{ip}</Typography>
            <div className={classes.indented}>
              <div className={classes.spaceBetween}>
                <Typography>Status</Typography>
                <Typography>
                  {renderStatusWithColor(
                    info.online,
                    'Established',
                    'Disconnected',
                  )}
                </Typography>
              </div>
              <div className={classes.spaceBetween}>
                <Typography>ASN</Typography>
                <Typography>{info.asn}</Typography>
              </div>
              <div className={classes.spaceBetween}>
                <Typography>{info.online ? 'Uptime' : 'Downtime'}</Typography>
                <Typography>{info.upDownTime}</Typography>
              </div>
              <div className={classes.spaceBetween}>
                <Typography>
                  {isNaN(info.stateOrPfxRcd) ? 'State' : 'Received Prefixes'}
                </Typography>
                <Typography>{info.stateOrPfxRcd}</Typography>
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

  renderBgpRoutes(routes, title) {
    // Render the routes list for a BGP neighbor
    const {classes} = this.props;

    return (
      <>
        <div className={classes.spaceBetween}>
          <Typography>{title}</Typography>
          <Typography>{formatNumber(routes.length)}</Typography>
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

  renderSoftwareVersion(version) {
    // Render the node's software version
    const {classes} = this.props;

    return (
      <>
        <Typography variant="subtitle2" className={classes.sectionHeading}>
          Software Version
        </Typography>
        <Typography gutterBottom>
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
          <Typography>
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
          <Typography>{node.mac_addr || 'none'}</Typography>
        </div>
        {node.hasOwnProperty('wlan_mac_addrs') && node.wlan_mac_addrs.length ? (
          <>
            {node.wlan_mac_addrs.map((mac, index) => (
              <div key={mac} className={classes.spaceBetween}>
                <Typography variant="subtitle2">
                  {index === 0 ? 'Radio MACs' : ''}
                </Typography>
                <Typography>{mac}</Typography>
              </div>
            ))}
          </>
        ) : null}
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">IPv6</Typography>
          <Typography>
            {statusReport ? statusReport.ipv6Address : 'none'}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Node Type</Typography>
          <Typography>{nodeType}</Typography>
        </div>
        {node.ant_azimuth > 0.0 ? (
          <div className={classes.spaceBetween}>
            <Typography variant="subtitle2">Azimuth</Typography>
            <Typography>{formatNumber(node.ant_azimuth)}&deg;</Typography>
          </div>
        ) : null}
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Last Reported</Typography>
          <Typography>
            {statusReport
              ? moment(new Date(statusReport.timeStamp * 1000)).fromNow()
              : 'n/a'}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Availability</Typography>
          <Typography>
            {renderAvailabilityWithColor(formatNumber(availability))}
          </Typography>
        </div>

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
      />
    );
  }
}

NodeDetailsPanel.propTypes = {
  classes: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
  onPanelChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  networkName: PropTypes.string.isRequired,
  topology: PropTypes.object.isRequired,
  ctrlVersion: PropTypes.string,
  node: PropTypes.object.isRequired,
  statusReport: PropTypes.object,
  networkNodeHealth: PropTypes.object.isRequired,
  onSelectLink: PropTypes.func.isRequired,
  onSelectSite: PropTypes.func.isRequired,
  pinned: PropTypes.bool.isRequired,
  onPin: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  nearbyNodes: PropTypes.object,
  onUpdateNearbyNodes: PropTypes.func,
  routes: PropTypes.object,
  onUpdateRoutes: PropTypes.func,
};

export default withStyles(styles)(withRouter(NodeDetailsPanel));
