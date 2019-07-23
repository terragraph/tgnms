/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import CustomExpansionPanel from '../common/CustomExpansionPanel';
import DeleteIcon from '@material-ui/icons/Delete';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import PropTypes from 'prop-types';
import React from 'react';
import StatusIndicator, {StatusIndicatorColor} from '../common/StatusIndicator';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import geolib from 'geolib';
import moment from 'moment';
import {LinkType} from '../../../thrift/gen-nodejs/Topology_types';
import {apiServiceRequestWithConfirmation} from '../../apiutils/ServiceAPIUtil';
import {
  createActionsMenu,
  getEditIcon,
  getNodeIcon,
  getSiteIcon,
} from '../../helpers/MapPanelHelpers';
import {formatNumber} from '../../helpers/StringHelpers';
import {
  isNodeAlive,
  renderAvailabilityWithColor,
} from '../../helpers/NetworkHelpers';
import {withStyles} from '@material-ui/core/styles';

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
});

class SiteDetailsPanel extends React.Component {
  state = {
    highlightedSiteNode: null,
  };

  getSiteLinks(siteNodes, links) {
    // Find all wireless links associated with nodes on this site
    return links.filter(
      link =>
        link.link_type === LinkType.WIRELESS &&
        (siteNodes.has(link.a_node_name) || siteNodes.has(link.z_node_name)),
    );
  }

  getPositionString(lat, lon) {
    // Returns a formatted GPS position string given a latitude/longitude
    // ex. '40.446° N 79.982° W'
    const latStr = lat >= 0 ? lat + '\xB0 N' : -lat + '\xB0 S';
    const lonStr = lon >= 0 ? lon + '\xB0 E' : -lon + '\xB0 W';
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
      const radioMacs = [
        ...new Set([node.mac_addr, ...(node.wlan_mac_addrs || [])]),
      ];
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
          let angle = geolib.getBearing(
            {
              latitude: aSite.location.latitude,
              longitude: aSite.location.longitude,
            },
            {
              latitude: zSite.location.latitude,
              longitude: zSite.location.longitude,
            },
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

  onDeleteSite() {
    // Delete this site
    const {site, networkName} = this.props;

    const data = {siteName: site.name};
    apiServiceRequestWithConfirmation(networkName, 'delSite', data, {
      desc: `Do you want to permanently delete site
      <strong>${site.name}</strong>?`,
      descType: 'html',
    });
  }

  onEditSite() {
    // Edit this site
    const {site, onClose, onEdit} = this.props;

    onEdit({name: site.name, ...site.location});
    onClose();
  }

  renderActions() {
    // Render actions
    const actionItems = [
      {
        heading: 'Topology',
        actions: [
          {
            label: 'Edit Site',
            icon: getEditIcon(),
            func: () => this.onEditSite(),
          },
          {
            label: 'Delete Site',
            icon: <DeleteIcon />,
            func: () => this.onDeleteSite(),
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

        <List component="nav">
          {[...siteNodes].map(node => (
            <ListItem
              button
              dense
              key={node}
              onClick={() => this.props.onSelectNode(node)}
              onMouseOver={() => this.setState({highlightedSiteNode: node})}
              onMouseOut={() => this.setState({highlightedSiteNode: null})}
              selected={node === highlightedSiteNode}>
              <ListItemIcon classes={{root: classes.listItemIcon}}>
                {getNodeIcon()}
              </ListItemIcon>
              <ListItemText
                primary={node}
                primaryTypographyProps={{variant: 'subtitle2'}}
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
      ...Object.entries(angleMap).map(([nodeName, sectorAngles]) =>
        Object.entries(sectorAngles).map(([macAddr, angle]) => {
          const p1 = this.angleToPathCoords(angle - HALF_ARC_ANGLE, SVG_WIDTH);
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
                nodeName === highlightedSiteNode && classes.trianglePathActive,
              )}
              d={`M${SVG_WIDTH / 2} ${SVG_WIDTH / 2} ${p1.path} ${p2.path} Z`}
              onClick={() => this.props.onSelectNode(nodeName)}
              onMouseOver={() => this.setState({highlightedSiteNode: nodeName})}
              onMouseOut={() => this.setState({highlightedSiteNode: null})}
            />
          );
        }),
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
              formatNumber(site.location.latitude, 4),
              formatNumber(site.location.longitude, 4),
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
    const {classes, expanded, onPanelChange, onClose, onPin, site} = this.props;

    return (
      <CustomExpansionPanel
        title={site.name}
        titleIcon={getSiteIcon({classes: {root: classes.iconCentered}})}
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

SiteDetailsPanel.propTypes = {
  classes: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
  onPanelChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  networkName: PropTypes.string.isRequired,
  topology: PropTypes.object.isRequired,
  site: PropTypes.object.isRequired,
  siteNodes: PropTypes.object.isRequired,
  nodeMap: PropTypes.object.isRequired,
  siteMap: PropTypes.object.isRequired,
  networkLinkHealth: PropTypes.object.isRequired,
  wapStats: PropTypes.object,
  onSelectNode: PropTypes.func.isRequired,
  pinned: PropTypes.bool.isRequired,
  onPin: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
};

export default withStyles(styles)(SiteDetailsPanel);
