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
import {BinaryStarFsmState} from '../../../thrift/gen-nodejs/Controller_types';
import {HighAvailability} from '../../constants/NetworkConstants';
import HAStatusMenuTitle from './HAStatusMenuTitle';
import StatusIndicator from '../common/StatusIndicator';

const propTypes = {
  networkConfig: PropTypes.shape({
    controller_events: PropTypes.arrayOf(PropTypes.array).isRequired,
    controller_online: PropTypes.bool.isRequired,
    haState: PropTypes.shape({
      primary: PropTypes.number,
      backup: PropTypes.number,
    }),
    topology: PropTypes.shape({
      links: PropTypes.arrayOf(PropTypes.object).isRequired,
      nodes: PropTypes.arrayOf(PropTypes.object).isRequired,
      sites: PropTypes.arrayOf(PropTypes.object).isRequired,
    }),
    query_service_online: PropTypes.bool.isRequired,
  }).isRequired,
};

const haStateToEnglish = {
  [HighAvailability.OFFLINE]: 'None',
  [HighAvailability.UNINITIALIZED]: 'None',
  [BinaryStarFsmState.STATE_PRIMARY]: 'Primary',
  [BinaryStarFsmState.STATE_BACKUP]: 'Backup',
  [BinaryStarFsmState.STATE_ACTIVE]: 'Active',
  [BinaryStarFsmState.STATE_PASSIVE]: 'Passive',
};

function NetworkStatusMenu({networkConfig}) {
  if (!has(networkConfig, 'topology')) {
    return null;
  }

  const {topology, haState = {}} = networkConfig;
  const {primary, backup} = haState;
  const highAvailabilityEnabled = primary !== HighAvailability.UNINITIALIZED;

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

  // TODO: Migrate event logs somewhere else
  const primaryControllerStatusList = [];
  if (networkConfig.hasOwnProperty('controller_events')) {
    networkConfig.controller_events.forEach(([timestamp, online], index) => {
      const timeStr = moment(timestamp).format('M/D/YY HH:mm:ss');

      primaryControllerStatusList.push(
        <MenuItem key={'e2e-status-events' + index} disabled>
          <StatusIndicator online={online} />
          {timeStr}
        </MenuItem>,
      );
    });
  }

  // List to show status of each controller
  let highAvailabilityList;
  if (highAvailabilityEnabled) {
    highAvailabilityList = [
      <MenuItem key="primary-ha-state" disabled>
        <StatusIndicator
          online={
            primary !== HighAvailability.OFFLINE &&
            primary !== HighAvailability.UNINITIALIZED
          }
        />
        <span>
          <div>Primary</div>
          <em className="ha-state">State: {haStateToEnglish[primary]}</em>
        </span>
      </MenuItem>,
      <MenuItem key="backup-ha-state" disabled>
        <StatusIndicator
          online={
            backup !== HighAvailability.OFFLINE &&
            backup !== HighAvailability.UNINITIALIZED
          }
        />
        <span>
          <div>Backup</div>
          <em className="ha-state">State: {haStateToEnglish[backup]}</em>
        </span>
      </MenuItem>,
    ];
  }

  return (
    <Menu
      className="network-status-menu"
      mode="horizontal"
      style={{float: 'right'}}
      openAnimation="slide-up">
      <SubMenu
        disabled={isEmpty(primaryControllerStatusList)}
        key="e2e-status-menu"
        mode="vertical"
        title={
          highAvailabilityEnabled ? (
            <HAStatusMenuTitle primary={primary} backup={backup} />
          ) : (
            <span>
              <StatusIndicator online={networkConfig.controller_online} />
              E2E
            </span>
          )
        }>
        {highAvailabilityEnabled
          ? highAvailabilityList
          : primaryControllerStatusList}
      </SubMenu>
      <Divider key="status-divider" />
      <SubMenu
        key="nms-status-menu"
        mode="vertical"
        title={
          <span>
            <StatusIndicator online={networkConfig.query_service_online} />
            Stats
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
