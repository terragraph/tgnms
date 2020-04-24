/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Collapse from '@material-ui/core/Collapse';
import Divider from '@material-ui/core/Divider';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import LocationOnIcon from '@material-ui/icons/LocationOn';
import NetworkContext from '../../contexts/NetworkContext';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import {NodeTypeValueMap as NodeType} from '../../../shared/types/Topology';
import {TopologyElementType} from '../../constants/NetworkConstants';
import {isNodeAlive} from '../../helpers/NetworkHelpers';
import type {NetworkContextType} from '../../contexts/NetworkContext';

type NetworkNodeRowType = {
  name: string,
  mac_addr: string,
  node_type: string,
  alive: boolean,
  site_name: string,
  pop_node: boolean,
  ipv6: ?string,
  version: ?string,
  minion_restarts: ?number,
  uboot_version: ?string,
  hw_board_id: ?string,
};

type Props = {
  context: NetworkContextType,
};

type State = {
  selectedSite: ?string,
  openSections: {[string]: boolean},
};

// TODO add logic when selecting nodes
export default class NetworkNodesTable extends React.Component<Props, State> {
  state = {
    // Selected elements (derived from NetworkContext)
    selectedSite: null,

    // Keep track of sections opened
    openSections: {}, // site_name: boolean
  };

  static getDerivedStateFromProps(nextProps: Props, _prevState: State) {
    // Update selected rows
    const {selectedElement} = nextProps.context;

    if (selectedElement && selectedElement.type === TopologyElementType.SITE) {
      return {
        selectedSite: selectedElement.name,
      };
    }
    return {selectedSite: null};
  }

  headers = [
    {
      label: 'Name',
      key: 'name',
    },
    {label: 'MAC', key: 'mac_addr'},
    {
      label: 'IPv6',
      key: 'ipv6',
    },
    {label: 'Type', key: 'node_type'},
    {
      label: 'Board ID',
      key: 'hw_board_id',
    },
    {
      label: 'Alive?',
      key: 'alive',
    },
    {
      label: 'Site',
      key: 'site_name',
    },
    {
      label: 'POP?',
      key: 'pop_node',
    },
    {
      label: 'Minion Restarts (24hr)',
      key: 'minion_restarts',
    },
    {
      label: 'Image Version',
      key: 'version',
    },
    {
      label: 'Uboot Version',
      key: 'uboot_version',
    },
  ];

  _trimVersionString(v: string) {
    const releasePrefix = 'RELEASE_ ';
    const index = v.indexOf(releasePrefix);
    return index >= 0 ? v.substring(index) : v;
  }

  getTableRows(
    context: NetworkContextType,
    siteName: string,
  ): Array<NetworkNodeRowType> {
    const {networkConfig, nodeMap, siteToNodesMap} = context;
    const {status_dump} = networkConfig;
    const rows = [];
    siteToNodesMap[siteName].forEach(nodeName => {
      const node = nodeMap[nodeName];
      const statusReport =
        status_dump &&
        status_dump.statusReports &&
        status_dump.statusReports.hasOwnProperty(node.mac_addr)
          ? status_dump.statusReports[node.mac_addr]
          : null;
      const ipv6 = statusReport ? statusReport.ipv6Address : null;
      const version = statusReport
        ? this._trimVersionString(statusReport.version)
        : null;
      const ubootVersion =
        statusReport && statusReport.ubootVersion
          ? statusReport.ubootVersion
          : null;
      const hwBoardId =
        statusReport && statusReport.hardwareBoardId
          ? statusReport.hardwareBoardId
          : null;

      // node health data
      let minionRestarts = null;
      if (
        context.networkNodeHealthPrometheus &&
        context.networkNodeHealthPrometheus.hasOwnProperty(node.name)
      ) {
        minionRestarts = Number.parseInt(
          context.networkNodeHealthPrometheus[node.name][
            'resets_e2e_minion_uptime'
          ],
        );
      } else if (
        context.networkNodeHealth &&
        context.networkNodeHealth.hasOwnProperty('events') &&
        context.networkNodeHealth.events.hasOwnProperty(node.name)
      ) {
        minionRestarts =
          context.networkNodeHealth.events[node.name].events.length;
      }
      rows.push({
        alive: isNodeAlive(node.status),
        hw_board_id: hwBoardId,
        ipv6,
        key: node.name,
        mac_addr: node.mac_addr,
        minion_restarts: minionRestarts,
        name: node.name,
        node_type: node.node_type === NodeType.DN ? 'DN' : 'CN',
        pop_node: node.pop_node,
        site_name: node.site_name,
        uboot_version: ubootVersion,
        version,
      });
    });
    return rows;
  }

  tableOnRowSelect = (nodeName: string) => {
    // Select a node
    const {context} = this.props;
    context.setSelected(TopologyElementType.NODE, nodeName);
  };

  toggleSection = (siteName: string) => {
    const {openSections} = this.state;
    this.setState({
      openSections: {...openSections, [siteName]: !openSections[siteName]},
    });
  };

  renderCell = (cell: number | string | ?boolean) => {
    if (typeof cell === 'boolean') {
      return <span>{cell ? 'Yes' : 'No'}</span>;
    } else {
      return cell ? (
        <span>{cell}</span>
      ) : (
        <span style={{fontStyle: 'italic'}}>Not Available</span>
      );
    }
  };

  render() {
    const {context} = this.props;
    const {openSections} = this.state;
    const {nodeMap, siteToNodesMap} = context;
    const sites = context.networkConfig.topology.sites;
    return (
      <NetworkContext.Consumer>
        {() => (
          <List style={{overflow: 'auto'}}>
            {sites.map(site => {
              const onlineCount = [
                ...siteToNodesMap[site.name],
              ].filter(nodeName => isNodeAlive(nodeMap[nodeName].status))
                .length;
              return (
                <React.Fragment key={site.name}>
                  <ListItem
                    button
                    onClick={() => this.toggleSection(site.name)}>
                    <ListItemIcon>
                      <LocationOnIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={site.name}
                      secondary={`${onlineCount}/${
                        siteToNodesMap[site.name].size
                      } nodes online`}
                    />
                    {openSections[site.name] ? <ExpandLess /> : <ExpandMore />}
                  </ListItem>
                  <Collapse in={openSections[site.name]} unmountOnExit>
                    <TableContainer component={Paper}>
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            {this.headers.map(header => (
                              <TableCell key={header.label} align="center">
                                {header.label}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {this.getTableRows(context, site.name).map(
                            (row, i) => (
                              <TableRow
                                key={row.name + '-' + i}
                                onClick={() => this.tableOnRowSelect(row.name)}>
                                {Object.keys(row)
                                  .sort((a, b) => {
                                    const aIndex = this.headers.findIndex(
                                      header => header.key === a,
                                    );
                                    const bIndex = this.headers.findIndex(
                                      header => header.key === b,
                                    );
                                    if (aIndex > bIndex) {
                                      return 1;
                                    }
                                    if (aIndex < bIndex) {
                                      return -1;
                                    }
                                    return 0;
                                  })
                                  .filter(key => key != 'name')
                                  .map(key => (
                                    <TableCell
                                      key={row.name + '-' + key}
                                      align="center">
                                      {this.renderCell(row[key])}
                                    </TableCell>
                                  ))}
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
        )}
      </NetworkContext.Consumer>
    );
  }
}
