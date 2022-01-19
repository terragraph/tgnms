/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as turf from '@turf/turf';

import ActionsMenu from './ActionsMenu/ActionsMenu';
import AddLocationIcon from '@material-ui/icons/AddLocation';
import Button from '@material-ui/core/Button';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Divider from '@material-ui/core/Divider';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import LocationOnIcon from '@material-ui/icons/LocationOn';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import SiteDetailsNodeIcon from '@fbcnms/tg-nms/app/views/map/mappanels/SiteDetailsNodeIcon';
import StatusIndicator, {
  StatusIndicatorColor,
} from '@fbcnms/tg-nms/app/components/common/StatusIndicator';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import moment from 'moment';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {apiRequest} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {
  deleteLinkRequest,
  getConfigOverrides,
  getTunnelConfigs,
} from '@fbcnms/tg-nms/app/helpers/TopologyHelpers';
import {formatNumber} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {isFeatureEnabled} from '@fbcnms/tg-nms/app/constants/FeatureFlags';
import {
  isNodeAlive,
  renderAvailabilityWithColor,
} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {locToPos} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {withStyles} from '@material-ui/core/styles';

import type {AzimuthManager} from '@fbcnms/tg-nms/app/features/topology/useAzimuthManager';
import type {LinkMeta} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {
  LinkType,
  NodeType as Node,
  SiteType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {
  NetworkHealth,
  NetworkState,
} from '@fbcnms/tg-nms/shared/dto/NetworkState';

const styles = theme => ({
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
  sectionHeading: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: theme.palette.grey[700],
    paddingTop: theme.spacing(1),
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  sectorOrientationSvg: {
    display: 'block',
    margin: '0 auto',
    width: '50%',
  },
  circlePath: {
    fill: 'white',
    stroke: 'black',
    strokeWidth: 10,
  },
  trianglePath: {
    fill: theme.palette.primary.light,
    stroke: 'black',
    strokeWidth: 5,
    cursor: 'pointer',
  },
  trianglePathActive: {
    fill: theme.palette.primary.dark,
    strokeWidth: 10,
  },
  root: {
    width: '40%',
    minWidth: 400,
  },
  button: {
    margin: theme.spacing(1),
    float: 'right',
  },
});

type Props = {
  classes: {[string]: string},
  networkName: string,
  networkConfig: NetworkState,
  topology: TopologyType,
  siteMap: {[string]: SiteType},
  siteNodes: Set<string>,
  nodeMap: {[string]: Node},
  nodeToLinksMap: {[string]: Set<string>},
  linkMap: {[string]: LinkType & LinkMeta},
  networkLinkHealth: NetworkHealth,
  wapStats?: Object,
  onSelectNode: string => any,
  onEdit: (siteName: string) => void,
  expanded: boolean,
  onPanelChange: () => any,
  onClose: () => any,
  onPin: () => any,
  pinned: boolean,
  site: SiteType,
  azimuthManager: AzimuthManager,
  snackbars: {
    success: string => any,
    error: string => any,
    warning: string => any,
  },
  onUpdateRoutes: ({
    node: ?string,
    links: {[string]: number},
    nodes: Set<string>,
  }) => any,
};

type State = {
  highlightedSiteNode: ?string,
  openConfirmationModal: boolean,
};

class SiteDetailsPanel extends React.Component<Props, State> {
  state = {
    highlightedSiteNode: null,
    openConfirmationModal: false,
  };

  getSiteLinks(siteNodes, links) {
    // Find all wireless links associated with nodes on this site
    return links.filter(
      link =>
        link.link_type === LinkTypeValueMap.WIRELESS &&
        (siteNodes.has(link.a_node_name) || siteNodes.has(link.z_node_name)),
    );
  }

  getPositionString(lat: number, lon: number) {
    // Returns a formatted GPS position string given a latitude/longitude
    // ex. '40.446° N 79.982° W'

    const latStr =
      lat >= 0
        ? formatNumber(lat, 4) + '\xB0 N'
        : formatNumber(-lat, 4) + '\xB0 S';
    const lonStr =
      lon >= 0
        ? formatNumber(lon, 4) + '\xB0 E'
        : formatNumber(-lon, 4) + '\xB0 W';

    return latStr + ' ' + lonStr;
  }

  computeAvailability(siteLinks, networkLinkHealth) {
    // Compute site availability percentage based on site links
    const linkHealth = networkLinkHealth.events || {};

    let alivePercAvg = 0;
    let numLinks = 0;
    siteLinks.forEach(link => {
      let alivePerc = NaN;
      if (linkHealth.hasOwnProperty(link.name)) {
        alivePerc = linkHealth[link.name].linkAvailForData || NaN;
      }
      if (!isNaN(alivePerc)) {
        alivePercAvg += alivePerc;
        numLinks++;
      }
    });
    if (numLinks > 0) {
      alivePercAvg /= numLinks;
    }

    return alivePercAvg;
  }

  angleToPathCoords(angle, width, arc = false) {
    // Compute path coords based on angle and maximum width of the graph
    const radians = ((angle - 90) * Math.PI) / 180;
    const x = (width / 2) * Math.cos(radians) + width / 2;
    const y = (width / 2) * Math.sin(radians) + width / 2;
    const path = arc
      ? `A${width / 2},${width / 2} 0 0,1 ${x},${y}`
      : `L${x} ${y}`;
    return {x, y, path};
  }

  computeSectorAngles(siteNodes, siteLinks, nodeMap, siteMap) {
    // Compute all sector angles for the given nodes/links
    // For P2MP cases, the average angle is returned
    // Returns: {nodeName: {radioMac: angle}}
    const angleMap = {};
    siteNodes.forEach(nodeName => {
      if (!nodeMap.hasOwnProperty(nodeName)) {
        return;
      }

      // Find all links with this node
      const node = nodeMap[nodeName];
      const nodeLinks = siteLinks.filter(
        link => link.a_node_name === nodeName || link.z_node_name === nodeName,
      );
      if (nodeLinks.length === 0) {
        // Node has no links and azimuth is set?
        if (node.ant_azimuth > 0) {
          angleMap[nodeName] = {[node.mac_addr]: node.ant_azimuth};
        }
        return;
      }

      // Node has links - loop through all of its sectors...
      const sectorAngles = {};
      const radioMacs = Array.from(
        new Set([node.mac_addr, ...(node.wlan_mac_addrs || [])]),
      );
      [...radioMacs].forEach(macAddr => {
        // Find all links with this sector
        const sectorLinks = nodeLinks.filter(
          link => link.a_node_mac === macAddr || link.z_node_mac == macAddr,
        );
        if (sectorLinks.length === 0) {
          return;
        }

        // Calculate angles
        let totalAngle = 0;
        sectorLinks.forEach(link => {
          const aSite = siteMap[nodeMap[link.a_node_name].site_name];
          const zSite = siteMap[nodeMap[link.z_node_name].site_name];
          let angle = turf.bearing(
            locToPos(aSite.location),
            locToPos(zSite.location),
          );
          if (aSite.name === node.site_name) {
            angle = angle < 0 ? angle + 360 : angle;
          } else {
            angle = ((angle < 0 ? angle + 360 : angle) + 180) % 360;
          }
          totalAngle += angle;
        });
        sectorAngles[macAddr] = totalAngle / sectorLinks.length;
      });

      if (Object.keys(sectorAngles).length > 0) {
        angleMap[nodeName] = sectorAngles;
      }
    });
    return angleMap;
  }

  async onDeleteSite() {
    // Delete this site
    const {
      site,
      siteNodes,
      networkName,
      nodeToLinksMap,
      linkMap,
      nodeMap,
      azimuthManager,
      snackbars,
      networkConfig,
      onClose,
    } = this.props;
    const siteName = site.name;
    const nodeNames = [...siteNodes];
    const linkNames = [];
    nodeNames.forEach(nodeName => linkNames.push(...nodeToLinksMap[nodeName]));
    try {
      // Force users to manually remove tunnels before deletion.
      const tunnels = [];
      for (const nodeName of nodeNames) {
        const tunnelConfigs = getTunnelConfigs(
          getConfigOverrides(networkConfig),
          nodeName,
        );
        tunnels.push(...Object.keys(tunnelConfigs ?? {}));
      }
      if (tunnels.length != 0) {
        snackbars.error(
          'Please remove any tunnels connected to this site before deleting.',
        );
        return;
      }
      // Delete all links
      await Promise.all(
        linkNames.map(linkName => {
          const link = linkMap[linkName];
          deleteLinkRequest({
            nodeMap,
            link,
            networkName,
            azimuthManager,
          });
        }),
      );

      // Delete all nodes
      await Promise.all(
        nodeNames.map(nodeName =>
          apiRequest<{nodeName: string}, any>({
            networkName,
            endpoint: 'delNode',
            data: {nodeName, force: true},
          }),
        ),
      );

      // Delete site.
      const {message} = await apiRequest<{siteName: string}, any>({
        networkName,
        endpoint: 'delSite',
        data: {siteName},
      });

      // Recompute azimuths if needed.
      await azimuthManager.deleteSite({siteName});
      snackbars.success(message);
      onClose();
    } catch (err) {
      snackbars.error(err);
      return;
    }
  }

  onEditSite() {
    // Edit this site
    const {site, onClose, onEdit} = this.props;
    onEdit(site.name);
    onClose();
  }

  onShowRoutes = () => {
    // Show Routes from first node in site set
    const {siteNodes, onUpdateRoutes} = this.props;
    onUpdateRoutes({
      node: siteNodes.values().next().value,
      links: {},
      nodes: new Set(),
    });
  };

  renderActions() {
    // Render actions
    const actionItems = [
      {
        heading: 'Topology',
        actions: [
          {
            label: 'Edit Site',
            func: () => this.onEditSite(),
          },
          {
            label: 'Delete Site',
            func: () =>
              this.props.siteNodes.size === 0
                ? this.onDeleteSite()
                : this.setState({openConfirmationModal: true}),
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
                  func: this.onShowRoutes,
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

  renderSiteNodes(siteLinks) {
    // Render site nodes
    const {classes, siteNodes, nodeMap} = this.props;
    const {highlightedSiteNode} = this.state;

    if (siteNodes.size === 0) {
      return <div className={classes.sectionSpacer} />;
    }
    return (
      <>
        <div className={classes.sectionSpacer} />
        <Divider />

        {this.renderSectorOrientation(siteLinks)}

        <List component="nav" className={STEP_TARGET.SITE_DETAILS}>
          {Array.from(siteNodes).map(node => (
            <ListItem
              button
              dense
              key={node}
              onClick={() => this.props.onSelectNode(node)}
              onMouseOver={() => this.setState({highlightedSiteNode: node})}
              onMouseOut={() => this.setState({highlightedSiteNode: null})}
              selected={node === highlightedSiteNode}>
              <ListItemIcon classes={{root: classes.listItemIcon}}>
                <SiteDetailsNodeIcon selectedNode={nodeMap[node]} />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Tooltip title={node} placement="top">
                    <Typography variant="subtitle2" noWrap={true}>
                      {node}
                    </Typography>
                  </Tooltip>
                }
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

  renderSectorOrientation(siteLinks) {
    // Render sector orientation diagram (angled triangle slices)
    const {classes, siteNodes, siteMap, nodeMap} = this.props;
    const {highlightedSiteNode} = this.state;

    // Calculate sector angles
    const angleMap = this.computeSectorAngles(
      siteNodes,
      siteLinks,
      nodeMap,
      siteMap,
    );
    if (Object.keys(angleMap).length === 0) {
      return null;
    }

    // Render as SVG with the following properties...
    const SVG_WIDTH = 1000; // max square dimensions of viewbox
    const CIRCLE_RADIUS = Math.ceil(SVG_WIDTH / 20); // radius of inner circle
    const HALF_ARC_ANGLE = 30 / 2; // half the arc angle of the triangle slices
    const VIEWBOX_PAD = Math.ceil(SVG_WIDTH / 50); // extra space on each side

    // Compute all paths and min/max bounds
    let minY = SVG_WIDTH;
    let maxY = 0;
    const paths = [].concat(
      objectEntriesTypesafe<string, {[string]: number}>(angleMap).map(
        ([nodeName, sectorAngles]) =>
          objectEntriesTypesafe<string, number>(sectorAngles).map(
            ([macAddr, angle]) => {
              const p1 = this.angleToPathCoords(
                angle - HALF_ARC_ANGLE,
                SVG_WIDTH,
              );
              const p2 = this.angleToPathCoords(
                angle + HALF_ARC_ANGLE,
                SVG_WIDTH,
                true,
              );
              minY = Math.min(Math.min(p1.y, p2.y), minY);
              maxY = Math.max(Math.max(p1.y, p2.y), maxY);
              return (
                <path
                  key={macAddr}
                  className={classNames(
                    classes.trianglePath,
                    nodeName === highlightedSiteNode &&
                      classes.trianglePathActive,
                  )}
                  d={`M${SVG_WIDTH / 2} ${SVG_WIDTH / 2} ${p1.path} ${
                    p2.path
                  } Z`}
                  onClick={() => this.props.onSelectNode(nodeName)}
                  onMouseOver={() =>
                    this.setState({highlightedSiteNode: nodeName})
                  }
                  onMouseOut={() => this.setState({highlightedSiteNode: null})}
                />
              );
            },
          ),
      ),
    );

    // Always show the middle circle
    minY = Math.floor(Math.min(minY, SVG_WIDTH / 2 - CIRCLE_RADIUS));
    maxY = Math.ceil(Math.max(maxY, SVG_WIDTH / 2 + CIRCLE_RADIUS));

    // Set the viewbox
    const viewBox = [
      -VIEWBOX_PAD, // x
      minY - VIEWBOX_PAD, // y
      SVG_WIDTH + 2 * VIEWBOX_PAD, // width
      maxY - minY + 2 * VIEWBOX_PAD, // height
    ];

    return (
      <>
        <div className={classes.sectionSpacer} />
        <svg
          className={classes.sectorOrientationSvg}
          viewBox={viewBox.join(' ')}>
          <circle
            className={classes.circlePath}
            cx={SVG_WIDTH / 2}
            cy={SVG_WIDTH / 2}
            r={CIRCLE_RADIUS}
          />
          {paths}
        </svg>
      </>
    );
  }

  renderWAPStats() {
    const {classes, wapStats} = this.props;
    if (!wapStats) {
      return null;
    }

    return (
      <>
        <div className={classes.sectionSpacer} />
        <Divider />

        <Typography variant="subtitle2" className={classes.sectionHeading}>
          Access Point Details
        </Typography>

        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Total Clients</Typography>
          <Typography variant="body2">{wapStats.clientCount}</Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Last Seen</Typography>
          <Typography variant="body2">
            {moment(new Date(wapStats.lastSeenTime)).fromNow()}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Uptime</Typography>
          <Typography variant="body2">
            {moment.duration(wapStats.uptime, 'seconds').humanize()}
          </Typography>
        </div>
      </>
    );
  }

  renderDetails() {
    // Render details
    const {classes, site, siteNodes, topology, networkLinkHealth} = this.props;
    const siteLinks = this.getSiteLinks(siteNodes, topology.links);
    const availability = this.computeAvailability(siteLinks, networkLinkHealth);

    return (
      <>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Position</Typography>
          <Typography variant="body2">
            {this.getPositionString(
              site.location.latitude,
              site.location.longitude,
            )}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Altitude</Typography>
          <Typography variant="body2">
            {formatNumber(site.location.altitude)} meters
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Accuracy</Typography>
          <Typography variant="body2">
            {isNaN(site.location.accuracy)
              ? 'unknown'
              : formatNumber(site.location.accuracy) + ' meters'}
          </Typography>
        </div>
        <div className={classes.spaceBetween}>
          <Typography variant="subtitle2">Availability</Typography>
          <Typography variant="body2">
            {renderAvailabilityWithColor(formatNumber(availability))}
          </Typography>
        </div>
        {this.renderWAPStats()}
        {this.renderSiteNodes(siteLinks)}
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
      networkName,
      onPanelChange,
      onClose,
      onPin,
      pinned,
      site,
      siteNodes,
      topology,
    } = this.props;

    const nodeCount = siteNodes.size;
    const linkCount = this.getSiteLinks(siteNodes, topology.links).length;

    return (
      <>
        <CustomAccordion
          title={site.name}
          titleIcon={<LocationOnIcon classes={{root: classes.iconCentered}} />}
          details={this.renderPanel()}
          expanded={expanded}
          onChange={onPanelChange}
          onClose={onClose}
          onPin={onPin}
          pinned={pinned}
          showLoadingBar={false}
          showTitleCopyTooltip={true}
        />
        <MaterialModal
          className={classes.root}
          open={this.state.openConfirmationModal}
          onClose={() => this.setState({openConfirmationModal: false})}
          modalContent={
            <Grid container direction="column" spacing={2}>
              <Grid item container spacing={1}>
                <Grid item>
                  <AddLocationIcon />
                </Grid>
                <Grid item>
                  <Typography>Remove 1 site</Typography>
                </Grid>
              </Grid>
              <Grid item container spacing={1}>
                <Grid item>
                  <RouterIcon />
                </Grid>
                <Grid item>
                  <Typography>
                    Remove {nodeCount} node{nodeCount > 1 ? 's' : ''}
                  </Typography>
                </Grid>
              </Grid>
              <Grid item container spacing={1}>
                <Grid item>
                  <CompareArrowsIcon />
                </Grid>
                <Grid item>
                  <Typography>
                    Remove {linkCount} link{linkCount > 1 ? 's' : ''}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          }
          modalTitle={`The following items will be removed from ${networkName}`}
          modalActions={
            <>
              <Button
                className={classes.button}
                onClick={() => this.setState({openConfirmationModal: false})}
                variant="outlined">
                Cancel
              </Button>
              <Button
                className={classes.button}
                color="primary"
                onClick={() => {
                  this.setState({openConfirmationModal: false});
                  this.onDeleteSite();
                }}
                variant="contained">
                Remove {1 + nodeCount + linkCount} topology elements
              </Button>
            </>
          }
        />
      </>
    );
  }
}

export default withStyles(styles)(SiteDetailsPanel);
