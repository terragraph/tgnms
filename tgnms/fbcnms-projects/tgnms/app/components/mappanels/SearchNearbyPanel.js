/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import CircularProgress from '@material-ui/core/CircularProgress';
import Collapse from '@material-ui/core/Collapse';
import CustomExpansionPanel from '../common/CustomExpansionPanel';
import Divider from '@material-ui/core/Divider';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import IconButton from '@material-ui/core/IconButton';
import LinearScaleIcon from '@material-ui/icons/LinearScale';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import PropTypes from 'prop-types';
import React from 'react';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import moment from 'moment';
import {LinkTypeValueMap as LinkType} from '../../../shared/types/Topology';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '../../apiutils/ServiceAPIUtil';
import {
  approxDistance,
  renderSnrWithColor,
  renderSnrWithIcon,
} from '../../helpers/NetworkHelpers';
import {formatNumber} from '../../helpers/StringHelpers';
import {
  getAddSiteIcon,
  getLinkIcon,
  getNodeIcon,
  getSearchNearbyIcon,
} from '../../helpers/MapPanelHelpers';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(1),
  },
  sectionSpacer: {
    height: theme.spacing(1),
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  errorText: {
    color: 'red',
  },
  centered: {
    textAlign: 'center',
  },
  nearbyNodesListItem: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
  nearbyNodesHeading: {
    textTransform: 'none',
  },
  nearbyNodesListItemText: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  adjacentNodeListItem: {
    paddingLeft: theme.spacing(4),
    paddingTop: 2,
    paddingBottom: 2,
  },
  adjacentNodesText: {
    fontWeight: 'normal',
    textTransform: 'none',
    fontStyle: 'italic',
  },
  expandIconButton: {
    padding: '6px',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
});

class SearchNearbyPanel extends React.Component {
  state = {
    expanded: true,

    // Responder list state
    actionsAnchorEl: null,
    actionsData: {}, // {macAddr: string, isResponder: bool}
    expandedLists: {}, // {responderAddr: bool}

    // API request state
    isLoading: false,
    lastResponseTime: null,
    errorMsg: null,
  };

  componentDidMount() {
    // TODO Directly cancel promises instead (e.g. via axios.CancelToken)
    this._isMounted = true;
    this.onRequest();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  onRequest() {
    // Make an API request to start a topology scan
    const {node, networkName, nearbyNodes, onUpdateNearbyNodes} = this.props;
    const data = {txNode: node.name};

    // Show loading spinner
    if (!this.state.isLoading) {
      this.setState({isLoading: true});
    }

    // Make API request
    apiServiceRequest(networkName, 'startTopologyScan', data)
      .then(response => {
        if (!this._isMounted) {
          return; // component no longer mounted, so discard response
        }

        // Sort responders by quality
        const {responders} = response.data;
        responders.sort((a, b) => this.compareTopologyScanInfo(a, b));

        onUpdateNearbyNodes({...nearbyNodes, [node.name]: responders});
        this.setState({
          errorMsg: null,
          isLoading: false,
          lastResponseTime: new Date(),
          expandedLists: {},
        });
      })
      .catch(error => {
        if (!this._isMounted) {
          return; // component no longer mounted, so discard response
        }

        onUpdateNearbyNodes({...nearbyNodes, [node.name]: null});
        this.setState({
          errorMsg: getErrorTextFromE2EAck(error),
          isLoading: false,
          lastResponseTime: null,
          expandedLists: {},
        });
      });
  }

  compareTopologyScanInfo(responderA, responderB) {
    // Sort metric priorities:
    // 1. Decreasing SNR
    // 2. Increasing combinedAngle
    // 3. Increasing nearestSiteDistance
    if (responderA.bestSnr === responderB.bestSnr) {
      // If SNR is equal, try sorting by combined angle
      const combinedAngleA =
        Math.abs(responderA.bestTxAngle) + Math.abs(responderA.bestRxAngle);
      const combinedAngleB =
        Math.abs(responderB.bestTxAngle) + Math.abs(responderB.bestRxAngle);

      // If combined angle is equal, sort by nearestSiteDistance
      // A - B for increasing nearestSiteDistance
      if (combinedAngleA === combinedAngleB) {
        return responderA.nearestSiteDistance - responderB.nearestSiteDistance;
      }

      // A - B for increasing combinedAngle
      return combinedAngleA - combinedAngleB;
    }

    // B - A for decreasing SNR
    return responderB.bestSnr - responderA.bestSnr;
  }

  findNodeInTopology(macAddr) {
    const {topology} = this.props;
    const node = topology.nodes.filter(
      node =>
        node.mac_addr === macAddr ||
        (node.wlan_mac_addrs && node.wlan_mac_addrs.includes(macAddr)),
    );
    return node.length ? node[0] : null;
  }

  findLinkInTopology(node1, node2) {
    const {topology} = this.props;
    const link = topology.links.filter(
      link =>
        (link.a_node_name === node1 && link.z_node_name === node2) ||
        (link.a_node_name === node2 && link.z_node_name === node1),
    );
    return link.length ? link[0] : null;
  }

  renderNearbyNodes() {
    // Render list of nearby nodes
    const {node, nearbyNodes, onAddNode, onAddLink, onAddSite} = this.props;
    const {actionsAnchorEl, actionsData} = this.state;
    const responders = nearbyNodes[node.name];
    const responderCount = Array.isArray(responders) ? responders.length : 0;
    if (responderCount === 0) {
      return null;
    }

    // Set menu options (if menu is open)
    const options = [];
    if (actionsData.hasOwnProperty('macAddr')) {
      const rxNode = this.findNodeInTopology(actionsData.macAddr);
      const link = rxNode
        ? this.findLinkInTopology(node.name, rxNode.name)
        : null;

      if (rxNode) {
        // Show node name if it is in the topology
        options.push({label: rxNode.name, icon: getNodeIcon(), disabled: true});
      } else {
        options.push({
          label: 'Add Node',
          icon: getNodeIcon(),
          func: () => onAddNode({mac_addr: actionsData.macAddr}),
        });
      }
      if (actionsData.isResponder) {
        if (link) {
          // Show link name if it is in the topology
          options.push({label: link.name, icon: getLinkIcon(), disabled: true});
        } else if (rxNode) {
          // Render 'Add Link' button if node is present, but link is not
          options.push({
            label: 'Add Link',
            icon: getLinkIcon(),
            func: () =>
              onAddLink({
                linkNode1: node.name,
                linkNode2: rxNode.name,
                link_type: LinkType.WIRELESS,
              }),
          });
        }

        // Show 'Add Site' button if GPS location was reported
        if (actionsData.location) {
          options.push({
            label: 'Add Site',
            icon: getAddSiteIcon(),
            func: () => onAddSite(actionsData.location),
          });
        }
      }
    }

    return (
      <>
        <Divider />
        <List component="nav">
          {responders.map(responder => this.renderNearbyNode(responder))}
        </List>
        <Menu
          anchorEl={actionsAnchorEl}
          open={Boolean(actionsAnchorEl)}
          onClose={() => this.setState({actionsAnchorEl: null})}>
          {options.map(({label, icon, func, disabled}) => (
            <MenuItem
              key={label}
              disabled={!!disabled}
              onClick={() => {
                this.setState({actionsAnchorEl: null});
                func();
              }}>
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={label} />
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  renderNearbyNode(responder) {
    // Render a single "nearby node" list element, along with any adjacencies
    const {classes, site} = this.props;
    const {expandedLists} = this.state;
    const {bestSnr, bestTxAngle, bestRxAngle, responderInfo} = responder;
    const {addr, pos, adjs} = responderInfo;
    const expanded = !!expandedLists[addr];
    const existingNode = this.findNodeInTopology(addr);

    // Text lines
    const beamAngleText =
      formatNumber(bestTxAngle, 0) +
      '\u00b0 tx, ' +
      formatNumber(bestRxAngle, 0) +
      '\u00b0 rx';
    const snrText = (
      <>
        SNR: {renderSnrWithColor(formatNumber(bestSnr, 2))} | {beamAngleText}
      </>
    );
    const locationText = pos
      ? formatNumber(approxDistance(site.location, pos), 1) + ' meters away'
      : '(no location data reported)';

    // Adjacent nodes
    const adjacencies = adjs.length ? (
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {adjs.map(macAddr => {
            const existingAdjNode = this.findNodeInTopology(macAddr);
            return (
              <ListItem
                key={macAddr}
                className={classes.adjacentNodeListItem}
                button
                dense
                aria-haspopup={true}
                onClick={ev =>
                  this.setState({
                    actionsAnchorEl: ev.currentTarget,
                    actionsData: {macAddr, isResponder: false},
                  })
                }>
                <ListItemIcon>
                  <LinearScaleIcon />
                </ListItemIcon>
                <ListItemText
                  classes={{root: classes.nearbyNodesListItemText}}
                  primary={macAddr}
                  primaryTypographyProps={{
                    variant: 'button',
                    classes: {button: classes.adjacentNodesText},
                  }}
                  secondary={
                    existingAdjNode ? (
                      <span>
                        Node: <strong>{existingAdjNode.name}</strong>
                      </span>
                    ) : null
                  }
                  secondaryTypographyProps={{
                    classes: {root: classes.adjacentNodesText},
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      </Collapse>
    ) : null;

    return (
      <React.Fragment key={addr}>
        <ListItem
          className={classes.nearbyNodesListItem}
          button
          dense
          aria-haspopup={true}
          onClick={ev =>
            this.setState({
              actionsAnchorEl: ev.currentTarget,
              actionsData: {macAddr: addr, isResponder: true, location: pos},
            })
          }>
          <ListItemIcon>{renderSnrWithIcon(bestSnr)}</ListItemIcon>
          <ListItemText
            classes={{root: classes.nearbyNodesListItemText}}
            primary={addr}
            primaryTypographyProps={{
              variant: 'button',
              classes: {button: classes.nearbyNodesHeading},
            }}
            secondary={
              <React.Fragment>
                {existingNode ? (
                  <>
                    <span>
                      Node: <strong>{existingNode.name}</strong>
                    </span>
                    <br />
                  </>
                ) : null}
                <span>{snrText}</span>
                <br />
                <span>{locationText}</span>
              </React.Fragment>
            }
          />
          <ListItemSecondaryAction>
            <Tooltip title="Show Wired Adjacencies" placement="top">
              <IconButton
                classes={{root: classes.expandIconButton}}
                aria-label="Expand"
                onClick={event => {
                  event.stopPropagation();
                  this.setState({
                    expandedLists: {...expandedLists, [addr]: !expanded},
                  });
                }}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Tooltip>
          </ListItemSecondaryAction>
        </ListItem>

        {adjacencies}
      </React.Fragment>
    );
  }

  renderFooter() {
    // Render footer action
    return (
      <>
        <Divider />
        <List component="nav">
          <ListItem button dense onClick={_ev => this.onRequest()}>
            <ListItemText
              primary={'Scan Again\u2026'}
              primaryTypographyProps={{variant: 'button'}}
            />
          </ListItem>
        </List>
      </>
    );
  }

  renderHeader() {
    // Render header text
    const {classes, node, nearbyNodes} = this.props;
    const {lastResponseTime, errorMsg} = this.state;
    const responders = nearbyNodes[node.name];
    const responderCount = Array.isArray(responders) ? responders.length : 0;

    return (
      <>
        {errorMsg ? (
          <Typography className={classes.errorText} variant="subtitle1">
            Error: {errorMsg}
          </Typography>
        ) : (
          <Typography variant="subtitle1">
            Found {responderCount} {responderCount === 1 ? 'node' : 'nodes'}{' '}
            nearby.
          </Typography>
        )}
        {lastResponseTime ? (
          <Typography variant="body2">
            {'Refreshed ' + moment(lastResponseTime).fromNow() + '.'}
          </Typography>
        ) : null}

        <div className={classes.sectionSpacer} />
      </>
    );
  }

  renderLoading() {
    // Render loading spinner
    const {classes} = this.props;
    return (
      <div className={classes.centered}>
        <CircularProgress />
      </div>
    );
  }

  renderPanel() {
    const {isLoading} = this.state;
    if (isLoading) {
      return <div style={{width: '100%'}}>{this.renderLoading()}</div>;
    }

    return (
      <div style={{width: '100%'}}>
        {this.renderHeader()}
        {this.renderNearbyNodes()}
        {this.renderFooter()}
      </div>
    );
  }

  render() {
    const {classes, node, onClose} = this.props;
    const {expanded} = this.state;

    return (
      <CustomExpansionPanel
        title={node.name}
        titleIcon={getSearchNearbyIcon({classes: {root: classes.iconCentered}})}
        details={this.renderPanel()}
        expanded={expanded}
        onChange={() => this.setState({expanded: !expanded})}
        onClose={onClose}
      />
    );
  }
}

SearchNearbyPanel.propTypes = {
  classes: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  networkName: PropTypes.string.isRequired,
  topology: PropTypes.object.isRequired,
  node: PropTypes.object.isRequired,
  site: PropTypes.object.isRequired,
  nearbyNodes: PropTypes.object,
  onUpdateNearbyNodes: PropTypes.func.isRequired,
  onAddNode: PropTypes.func.isRequired,
  onAddLink: PropTypes.func.isRequired,
  onAddSite: PropTypes.func.isRequired,
};

export default withStyles(styles)(SearchNearbyPanel);
