/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Display docker containers list from a single host.
 */
'use strict';

import {CustomTableCell, styles} from './MaterialExpansionPanelStyles.js';
import {getContainersJson} from '../../apiutils/DockerUtils.js';
import PropTypes from 'prop-types';
import React from 'react';

import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import {withStyles} from '@material-ui/core/styles';

class DockerContainers extends React.Component {
  static propTypes = {
    instanceId: PropTypes.number.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      containerList: [],
      isExpanded: false,
    };
  }

  componentDidMount() {
    if (this.props.instanceId !== 0) {
      this.loadContainersList();
    }
  }

  loadContainersList() {
    // clear containers list before loading new
    this.setState({containerList: [], isExpanded: false});
    getContainersJson(this.props.instanceId).then(containerList =>
      this.setState({containerList, isExpanded: true}),
    );
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.instanceId !== this.props.instanceId) {
      this.loadContainersList();
    }
  }

  formatNetworks(networkList) {
    if (!networkList) {
      return '-';
    }
    return Object.keys(networkList).map(networkName => {
      const network = networkList[networkName];
      if (network.IPAddress.length && network.GlobalIPv6Address.length) {
        // v4 + v6
        return `${networkName}: ${network.IPAddress} +
                ${network.GlobalIPv6Address}/${network.GlobalIPv6PrefixLen}`;
      } else if (network.IPAddress.length) {
        // v4-only
        return `${networkName}: ${network.IPAddress}`;
      } else if (network.GlobalIPv6Address.length) {
        // v6-only
        return `${networkName}:
                ${network.GlobalIPv6Address}/${network.GlobalIPv6PrefixLen}`;
      } else {
        // network name only, usually 'host'
        return `${networkName}`;
      }
    }).join(', ');
  }

  render() {
    const {classes} = this.props;
    const {containerList, isExpanded} = this.state;
    return (
      <ExpansionPanel
        expanded={isExpanded}
        onChange={(evt, expanded) => this.setState({isExpanded: expanded})}>
        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
          <Typography className={classes.heading}>Containers</Typography>
        </ExpansionPanelSummary>
        {containerList.length && (
          <ExpansionPanelDetails>
            <Table className={classes.table}>
              <TableHead className={classes.head}>
                <TableRow>
                  <CustomTableCell>Name</CustomTableCell>
                  <CustomTableCell>Image</CustomTableCell>
                  <CustomTableCell>Network</CustomTableCell>
                  <CustomTableCell>Port(s)</CustomTableCell>
                  <CustomTableCell>State</CustomTableCell>
                  <CustomTableCell>Status</CustomTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {containerList.map(row => {
                  return (
                    <TableRow className={classes.row} key={row.Id}>
                      <CustomTableCell component="th" scope="row">
                        {row.Names.map(name => name)}
                      </CustomTableCell>
                      <CustomTableCell>{row.Image}</CustomTableCell>
                      <CustomTableCell>
                        {this.formatNetworks(row.NetworkSettings.Networks)}
                      </CustomTableCell>
                      <CustomTableCell>
                        {row.Ports.filter(port =>
                          port.hasOwnProperty('PublicPort'),
                        )
                          .map(port => port.PublicPort)
                          .join(', ')}
                      </CustomTableCell>
                      <CustomTableCell>{row.State}</CustomTableCell>
                      <CustomTableCell>{row.Status}</CustomTableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ExpansionPanelDetails>
        )}
      </ExpansionPanel>
    );
  }
}
export default withStyles(styles, {withTheme: true})(DockerContainers);
