/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AddLocationIcon from '@material-ui/icons/AddLocation';
import CircularProgress from '@material-ui/core/CircularProgress';
import Collapse from '@material-ui/core/Collapse';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Divider from '@material-ui/core/Divider';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import NearMeIcon from '@material-ui/icons/NearMe';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import Typography from '@material-ui/core/Typography';
import moment from 'moment';
import {LinkTypeValueMap as LinkType} from '@fbcnms/tg-nms/shared/types/Topology';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {
  approxDistance,
  renderSnrWithColor,
  renderSnrWithIcon,
} from '@fbcnms/tg-nms/app/helpers/NetworkHelpers';
import {formatNumber} from '@fbcnms/tg-nms/app/helpers/StringHelpers';
import {withStyles} from '@material-ui/core/styles';

import {objectEntriesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import type {
  EditLinkParams,
  EditNodeParams,
  NearbyNodes,
} from '@fbcnms/tg-nms/app/components/mappanels/MapPanelTypes';
import type {LocationType} from '@fbcnms/tg-nms/shared/types/Topology';
import type {
  NodeType,
  SiteType,
  TopologyType,
} from '@fbcnms/tg-nms/shared/types/Topology';
import type {Site} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import type {
  TopologyScanInfo,
  TopologyScanResponse,
  TopologyScanRespoonsePerRadio,
} from '@fbcnms/tg-nms/app/components/mappanels/MapPanelTypes';

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
  scanningStatusText: {
    paddingBottom: theme.spacing(),
  },
});

type Props = {
  classes: {[string]: string},
  onClose: () => any,
  networkName: string,
  topology: TopologyType,
  node: NodeType,
  site: Site,
  nearbyNodes: NearbyNodes,
  onUpdateNearbyNodes: NearbyNodes => any,
  onAddNode: ($Shape<EditNodeParams>) => any,
  onAddLink: EditLinkParams => any,
  onAddSite: ($Shape<SiteType>) => any,
};

type State = {
  expanded: boolean,
  actionsAnchorEl: ?HTMLElement,
  actionsData: {
    macAddr: string,
    radioMac: string,
    isResponder: boolean,
    location?: $Shape<LocationType & {name: string}>,
  },
  expandedLists: {responderAddr?: boolean},
  isLoading: boolean,
  radioScanIndex: number,
  lastResponseTime: ?Date,
  errorMsg: ?string,
  errorPerRadio: {
    [string /* radio mac */]: string,
  },
};

class SearchNearbyPanel extends React.Component<Props, State> {
  state = {
    expanded: true,

    // Responder list state
    actionsAnchorEl: null,
    actionsData: {}, // {macAddr: string, isResponder: bool}
    expandedLists: {}, // {responderAddr: bool}

    // API request state
    isLoading: false,
    radioScanIndex: 0,
    lastResponseTime: null,
    errorMsg: null,
    errorPerRadio: {},
  };

  _isMounted: boolean;

  componentDidMount() {
    // TODO Directly cancel promises instead (e.g. via axios.CancelToken)
    this._isMounted = true;
    this.onRequest();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  mapRadioResponders(allRadioMacs, radiosByResponder, newResponders) {
    const {node} = this.props;
    const {radioScanIndex} = this.state;
    const radioMac = node.wlan_mac_addrs[radioScanIndex];

    // map macs on the same node via adjacencies
    const nodeMacToAdjMac = {};

    // map existing responses per-node
    objectEntriesTypesafe<string, TopologyScanResponse>(
      radiosByResponder,
    ).forEach(([nodeMac, responderMap]) => {
      objectEntriesTypesafe<string, TopologyScanRespoonsePerRadio>(
        responderMap,
      ).forEach(([_responderMac, radioResponseMap]) => {
        objectEntriesTypesafe<string, TopologyScanInfo>(
          radioResponseMap,
        ).forEach(([_radioMac, response]) => {
          const {addr, adjs} = response.responderInfo;
          nodeMacToAdjMac[addr] = nodeMac;
          if (adjs) {
            adjs.forEach(adj => {
              nodeMacToAdjMac[adj] = nodeMac;
            });
          }
        });
      });
    });

    // map new response per-node
    newResponders.forEach(responder => {
      const {addr, adjs} = responder.responderInfo;
      // skip responses from ourselves
      if (allRadioMacs.has(addr)) {
        return;
      }

      adjs.forEach(adj => {
        if (!nodeMacToAdjMac.hasOwnProperty(adj)) {
          nodeMacToAdjMac[adj] = addr;
        }
      });
      if (!nodeMacToAdjMac.hasOwnProperty(addr)) {
        nodeMacToAdjMac[addr] = addr;
      }

      const nodeMac = nodeMacToAdjMac[addr];
      if (!radiosByResponder.hasOwnProperty(nodeMac)) {
        radiosByResponder[nodeMac] = {};
      }
      if (!radiosByResponder[nodeMac].hasOwnProperty(addr)) {
        radiosByResponder[nodeMac][addr] = {};
      }
      radiosByResponder[nodeMac][addr][radioMac] = responder;
    });
  }

  onRequest() {
    // Make an API request to start a topology scan
    const {node, networkName, nearbyNodes, onUpdateNearbyNodes} = this.props;
    let {errorPerRadio, isLoading, radioScanIndex} = this.state;

    // Show loading spinner
    if (!isLoading) {
      this.setState({
        isLoading: true,
        radioScanIndex: 0,
        errorPerRadio: {},
        expandedLists: {},
      });
      radioScanIndex = 0;
    }

    const radioMac = node.wlan_mac_addrs[radioScanIndex];
    const data = {txNode: radioMac};
    // Make API request
    apiServiceRequest(networkName, 'startTopologyScan', data)
      .then(response => {
        if (!this._isMounted) {
          return; // component no longer mounted, so discard response
        }

        const {responders} = response.data;
        let radiosByResponder = nearbyNodes[node.name];
        if (radiosByResponder === null) {
          radiosByResponder = {};
        }

        const allRadioMacs = new Set(node.wlan_mac_addrs);
        this.mapRadioResponders(allRadioMacs, radiosByResponder, responders);
        onUpdateNearbyNodes({[node.name]: radiosByResponder});

        const noMoreRadios = radioScanIndex + 1 >= node.wlan_mac_addrs.length;
        this.setState({
          isLoading: noMoreRadios ? false : true,
          lastResponseTime: new Date(),
          radioScanIndex: noMoreRadios ? radioScanIndex : radioScanIndex + 1,
        });

        // delay subsequent requests
        if (!noMoreRadios) {
          setTimeout(() => this.onRequest(), 300);
        }
      })
      .catch(error => {
        if (!this._isMounted) {
          return; // component no longer mounted, so discard response
        }
        errorPerRadio[radioMac] = getErrorTextFromE2EAck(error);

        const noMoreRadios = radioScanIndex + 1 >= node.wlan_mac_addrs.length;
        this.setState({
          isLoading: noMoreRadios ? false : true,
          radioScanIndex: noMoreRadios ? radioScanIndex : radioScanIndex + 1,
          lastResponseTime: new Date(),
          errorPerRadio,
        });

        // delay subsequent requests
        if (!noMoreRadios) {
          setTimeout(() => this.onRequest(), 300);
        }
      });
  }

  compareTopologyScanInfo(
    radioMacAndResponderA: [string, TopologyScanInfo],
    radioMacAndResponderB: [string, TopologyScanInfo],
  ) {
    if (
      radioMacAndResponderA.length !== 2 ||
      radioMacAndResponderB.length !== 2
    ) {
      return 0;
    }
    const responderA = radioMacAndResponderA[1];
    const responderB = radioMacAndResponderB[1];
    // Sort metric priorities:
    // 1. Decreasing SNR
    // 2. Increasing combinedAngle
    if (responderA.bestSnr === responderB.bestSnr) {
      // If SNR is equal, try sorting by combined angle
      const combinedAngleA =
        Math.abs(responderA?.bestTxAngle || 0) +
        Math.abs(responderA.bestRxAngle || 0);
      const combinedAngleB =
        Math.abs(responderB.bestTxAngle || 0) +
        Math.abs(responderB.bestRxAngle || 0);

      return combinedAngleB - combinedAngleA;
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
    const respondersByRadio = nearbyNodes[node.name];
    // group responderMac -> [radios that saw it]
    const responderCount =
      respondersByRadio === null ? 0 : respondersByRadio.length;
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
        options.push({
          label: rxNode.name,
          icon: <RouterIcon />,
          func: () => {},
          disabled: true,
        });
      } else {
        options.push({
          label: 'Add Node',
          icon: <RouterIcon />,
          func: () => onAddNode({mac_addr: actionsData.macAddr}),
          disabled: false,
        });
      }

      if (actionsData.isResponder) {
        if (link) {
          // Show link name if it is in the topology
          options.push({
            label: link.name,
            icon: <CompareArrowsIcon />,
            func: () => {},
            disabled: true,
          });
        } else if (rxNode) {
          // Render 'Add Link' button if node is present, but link is not
          options.push({
            label: 'Add Link',
            icon: <CompareArrowsIcon />,
            func: () =>
              onAddLink({
                linkNode1: node.name,
                linkNode1Mac: actionsData.radioMac,
                linkNode2: rxNode.name,
                linkNode2Mac: actionsData.macAddr,
                link_type: LinkType.WIRELESS,
              }),
            disabled: false,
          });
        }

        if (rxNode) {
          // Show site name if it is in the topology
          options.push({
            label: rxNode.site_name,
            icon: <AddLocationIcon />,
            func: () => {},
            disabled: true,
          });
        } else if (actionsData.location !== null) {
          // Show 'Add Site' button if GPS location was reported
          options.push({
            label: 'Add Site',
            icon: <AddLocationIcon />,
            func: () => onAddSite({location: actionsData.location}),
            disabled: false,
          });
        }
      }
    }

    const responderToRadioResponseBySiteMac = nearbyNodes[node.name];
    return (
      <>
        <List button component="nav">
          {objectEntriesTypesafe<string, TopologyScanResponse>(
            responderToRadioResponseBySiteMac,
          ).map(([adjNodeMac, responderMacToRadioResponse]) =>
            this.renderNearbyNode(adjNodeMac, responderMacToRadioResponse),
          )}
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

  renderNearbyNode(adjNodeMac, responderMacToRadioResponse) {
    // Render a single "nearby node" list element, along with any adjacencies
    const {classes, site} = this.props;
    const {expandedLists} = this.state;

    // sort per-radio responses
    let validPosition = undefined;
    const existingNode = this.findNodeInTopology(adjNodeMac);

    const radioResponses = objectEntriesTypesafe<
      string,
      TopologyScanRespoonsePerRadio,
    >(responderMacToRadioResponse).map(([responderMac, radioResponses]) => {
      const sortedResponses = objectEntriesTypesafe<string, TopologyScanInfo>(
        radioResponses,
      ).sort((a, b) => this.compareTopologyScanInfo(a, b));

      const expanded = !!expandedLists[adjNodeMac + '-' + responderMac];
      const sortedResponders = sortedResponses.map(
        ([radioMac, responder], index) => {
          const {bestSnr, bestTxAngle, bestRxAngle, responderInfo} = responder;
          const {addr, pos} = responderInfo;
          // use location from first node reporting gps
          if (validPosition === undefined && pos) {
            validPosition = pos;
          }
          // Text lines
          const beamAngleText =
            formatNumber(bestTxAngle, 0) +
            '\u00b0 tx, ' +
            formatNumber(bestRxAngle, 0) +
            '\u00b0 rx';
          const snrText = (
            <>
              SNR: {renderSnrWithColor(bestSnr)}
              <br />
              Beam: {beamAngleText}
            </>
          );
          const radioSnrText = (
            <React.Fragment>
              <ListItemIcon>{renderSnrWithIcon(bestSnr)}</ListItemIcon>
              <ListItemText
                classes={{root: classes.nearbyNodesListItemText}}
                primary={'Initiator: ' + radioMac}
                primaryTypographyProps={{
                  variant: 'button',
                  classes: {button: classes.nearbyNodesHeading},
                }}
                secondary={<span>{snrText}</span>}
              />
            </React.Fragment>
          );
          // make first radio responder clickable to view remaining responses
          if (index === 0 && sortedResponses.length > 1) {
            return (
              <ListItem
                key={radioMac + addr}
                className={classes.nearbyNodesListItem}
                button
                onClick={ev =>
                  this.setState({
                    actionsAnchorEl: ev.currentTarget,
                    actionsData: {
                      location: validPosition,
                      macAddr: responderMac,
                      radioMac: radioMac,
                      isResponder: true,
                    },
                  })
                }
                dense
                aria-haspopup={true}>
                {radioSnrText}
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="expand"
                    onClick={event => {
                      event.stopPropagation();
                      this.setState({
                        expandedLists: {
                          ...expandedLists,
                          [adjNodeMac + '-' + responderMac]: !expanded,
                        },
                      });
                    }}>
                    {expanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          } else {
            return (
              <ListItem
                key={radioMac + addr}
                className={classes.nearbyNodesListItem}
                button
                onClick={ev =>
                  this.setState({
                    actionsAnchorEl: ev.currentTarget,
                    actionsData: {
                      location: validPosition,
                      macAddr: responderMac,
                      radioMac: radioMac,
                      isResponder: true,
                    },
                  })
                }
                dense
                aria-haspopup={true}>
                {radioSnrText}
              </ListItem>
            );
          }
        },
      );
      return (
        <React.Fragment>
          <ListItem className={classes.nested}>
            <ListItemText
              classes={{root: classes.nearbyNodesListItemText}}
              primary={'Responder: ' + responderMac}
            />
          </ListItem>
          <Collapse in={true} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {sortedResponders[0]}
              {sortedResponders.length > 1 ? (
                <React.Fragment>
                  <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {sortedResponders.slice(1).map((responder, index) => {
                        return (
                          <ListItem
                            key={adjNodeMac + '-' + index}
                            className={classes.adjacentNodeListItem}
                            dense
                            aria-haspopup={true}>
                            <ListItemText
                              classes={{
                                root: classes.nearbyNodesListItemText,
                              }}
                              primary={responder}
                              primaryTypographyProps={{
                                variant: 'button',
                                classes: {button: classes.adjacentNodesText},
                              }}
                              secondaryTypographyProps={{
                                classes: {root: classes.adjacentNodesText},
                              }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                </React.Fragment>
              ) : null}
            </List>
          </Collapse>
        </React.Fragment>
      );
    });
    const locationText = validPosition
      ? formatNumber(approxDistance(site.location, validPosition), 1) +
        ' meters away'
      : '(no location data reported)';
    return (
      <React.Fragment>
        <Divider />
        <ListItem className={classes.nested}>
          <ListItemText
            classes={{root: classes.nearbyNodesListItemText}}
            primary={existingNode ? existingNode.name : 'Unknown Node'}
            secondary={<span>{locationText}</span>}
          />
        </ListItem>
        <Collapse in={true} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {radioResponses}
          </List>
        </Collapse>
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
    const {lastResponseTime, errorPerRadio} = this.state;
    const respondersByRadio = nearbyNodes[node.name];

    const responderCount =
      respondersByRadio !== null
        ? objectEntriesTypesafe<string, TopologyScanResponse>(respondersByRadio)
            .length
        : 0;
    return (
      <>
        {Object.values(errorPerRadio).length !== 0 ? (
          <React.Fragment>
            {objectEntriesTypesafe<string, string>(errorPerRadio).map(
              ([radioMac, errorMsg]) => (
                <React.Fragment>
                  <Typography variant="subtitle1">Radio: {radioMac}</Typography>
                  <Typography className={classes.errorText} variant="subtitle1">
                    {errorMsg}
                  </Typography>
                </React.Fragment>
              ),
            )}
            <Divider />
          </React.Fragment>
        ) : null}
        {responderCount !== 0 ? (
          <Typography variant="subtitle1">
            Found {responderCount} {responderCount === 1 ? 'node' : 'nodes'}{' '}
            nearby.
          </Typography>
        ) : null}
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
    const {classes, node} = this.props;
    const {radioScanIndex} = this.state;
    return (
      <div className={classes.centered}>
        <div className={classes.scanningStatusText}>
          Scanning radio {radioScanIndex + 1}/{node.wlan_mac_addrs.length}...
        </div>
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
      <CustomAccordion
        title={node.name}
        titleIcon={<NearMeIcon classes={{root: classes.iconCentered}} />}
        details={this.renderPanel()}
        expanded={expanded}
        onChange={() => this.setState({expanded: !expanded})}
        onClose={onClose}
      />
    );
  }
}

export default withStyles(styles)(SearchNearbyPanel);
