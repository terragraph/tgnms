/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import {has, isEmpty} from 'lodash-es';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import {Glyphicon} from 'react-bootstrap';
import Menu, {SubMenu, Item as MenuItem, Divider} from 'rc-menu';
import {
  LinkType,
  NodeStatusType,
} from '../../../thrift/gen-nodejs/Topology_types';
import StatusIndicator from '../common/StatusIndicator';

const propTypes = {
  networkConfig: PropTypes.shape({
    controller_events: PropTypes.arrayOf(PropTypes.array).isRequired,
    controller_online: PropTypes.bool.isRequired,
    topology: PropTypes.shape({
      links: PropTypes.arrayOf(PropTypes.object).isRequired,
      nodes: PropTypes.arrayOf(PropTypes.object).isRequired,
      sites: PropTypes.arrayOf(PropTypes.object).isRequired,
    }),
    query_service_online: PropTypes.bool.isRequired,
  }).isRequired,
};

function NetworkStatusMenu({networkConfig}) {
  if (!has(networkConfig, 'topology')) {
    return null;
  }

  const {topology} = networkConfig;

  // Count number of online links
  const wirelessLinks = topology.links.filter(
    link => link.link_type === LinkType.WIRELESS,
  );

  const onlineLinkCount = wirelessLinks.filter(link => link.is_alive).length;
  const wirelessLinkCount = wirelessLinks.length;

  // Count number of nodes online or are online initiators
  const sectorsOnline = topology.nodes.filter(
    node =>
      node.status === NodeStatusType.ONLINE ||
      node.status === NodeStatusType.ONLINE_INITIATOR,
  ).length;

  // TODO: Convert to B-Star High Availability List
  const e2eStatusList = [];
  if (networkConfig.hasOwnProperty('controller_events')) {
    networkConfig.controller_events.forEach(([timestamp, online], index) => {
      const timeStr = moment(timestamp).format('M/D/YY HH:mm:ss');

      e2eStatusList.push(
        <MenuItem key={'e2e-status-events' + index} disabled>
          <StatusIndicator online={online} />
          {timeStr}
        </MenuItem>,
      );
    });
  }

  return (
    <Menu
      className="network-status-menu"
      mode="horizontal"
      style={{float: 'right'}}
      openAnimation="slide-up">
      <SubMenu
        disabled={isEmpty(e2eStatusList)}
        key="e2e-status-menu"
        mode="vertical"
        title={
          <span>
            <StatusIndicator online={networkConfig.controller_online} />
            E2E
          </span>
        }>
        {e2eStatusList}
      </SubMenu>
      <Divider key="status-divider" />
      <SubMenu
        key="nms-status-menu"
        mode="vertical"
        title={
          <span>
            <StatusIndicator online={networkConfig.query_service_online} />
            STATS
          </span>
        }
        disabled
      />
      <Divider key="site-divider" />
      <MenuItem key="site-status" disabled>
        {topology.sites.length} Sites
      </MenuItem>
      <Divider key="sector-divider" />
      <MenuItem key="sector-status" disabled>
        {sectorsOnline}/{topology.nodes.length} Sectors
      </MenuItem>
      <Divider key="link-divider" />
      <MenuItem key="link-status" disabled>
        {onlineLinkCount}/{wirelessLinkCount} Links
      </MenuItem>
    </Menu>
  );
}

NetworkStatusMenu.propTypes = propTypes;
export default NetworkStatusMenu;
