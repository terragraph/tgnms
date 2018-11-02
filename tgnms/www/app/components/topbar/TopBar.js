/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
import PropTypes from 'prop-types';
import Menu, {Divider, Item as MenuItem, SubMenu} from 'rc-menu';
import React from 'react';
import {Glyphicon} from 'react-bootstrap';

import {HighAvailability} from '../../constants/NetworkConstants';
import {getStatusIndicatorColor} from '../../helpers/HighAvailabilityHelpers';
import {VIEWS} from '../../stores/NetworkStore.js';
import StatusIndicator from '../common/StatusIndicator';
import NetworkStatusMenu from './NetworkStatusMenu';

const propTypes = {
  handleMenuBarSelect: PropTypes.func.isRequired,
  networkName: PropTypes.string.isRequired,
  networkConfig: PropTypes.object.isRequired,
  topologies: PropTypes.arrayOf(PropTypes.object).isRequired,
  user: PropTypes.object,
  view: PropTypes.string.isRequired,
};

const TOPOLOGY_OPS = {
  addLink: {icon: 'transfer', name: 'New Link'},
  addNode: {icon: 'asterisk', name: 'New Node'},
  addSite: {icon: 'pushpin', name: 'New Planned Site'},
};

function TopBar(props) {
  // Create list of selected keys
  const selectedKeys = ['view#' + props.view];
  if (props.networkName) {
    selectedKeys.push('topo#' + props.networkName);
  }

  // NOTE: Can't create components for these functions because the <Menu />
  // creates refs for these submenu items which creates weird errors
  function createViewSubMenuItems() {
    return Object.keys(VIEWS).map(viewKey => (
      <MenuItem key={'view#' + viewKey}>
        <Glyphicon glyph={VIEWS[viewKey].icon} />
        {VIEWS[viewKey].name}
      </MenuItem>
    ));
  }

  function createTopologySubMenuItems() {
    return props.topologies.map(topologyConfig => {
      const keyName = 'topo#' + topologyConfig.name;
      const highAvailabilityEnabled =
        topologyConfig.haState &&
        topologyConfig.haState.primary !== HighAvailability.UNINITIALIZED;

      const statusIndicatorProps = {};
      if (highAvailabilityEnabled) {
        statusIndicatorProps.color = getStatusIndicatorColor(
          topologyConfig.haState.primary,
          topologyConfig.haState.backup,
        );
      } else {
        statusIndicatorProps.online = topologyConfig.controller_online;
      }

      return (
        <MenuItem key={keyName}>
          <StatusIndicator {...statusIndicatorProps} />
          {topologyConfig.name}
        </MenuItem>
      );
    });
  }

  function createMapSubMenuItems() {
    return [
      <Divider key={1} />,
      <SubMenu
        title={
          <span>
            Topology Builder <span className="caret" />
          </span>
        }
        key="topOps"
        mode="vertical">
        {Object.keys(TOPOLOGY_OPS).map(topOpsKey => (
          <MenuItem key={'topOps#' + topOpsKey}>
            <Glyphicon glyph={TOPOLOGY_OPS[topOpsKey].icon} />
            {TOPOLOGY_OPS[topOpsKey].name}
          </MenuItem>
        ))}
      </SubMenu>,
      <Divider key={2} />,
      <MenuItem key={'overlays#'}>
        <img className="overlay-image" src={'/static/images/overlays.png'} />
        Map Overlays
      </MenuItem>,
      /*
      <Divider key={3} />,
      <SubMenu
        title={
          <div>
            <span className="glyphicon glyphicon-user" />
            {props.user ? props.user.email.split('@')[0] : 'Guest'}
          </div>
        }
        key="user"
        mode="vertical">
        <MenuItem key="logout#">Logout</MenuItem>
      </SubMenu>,
      */
    ];
  }

  return (
    <div className="top-menu-bar">
      <Menu
        onSelect={props.handleMenuBarSelect}
        mode="horizontal"
        selectedKeys={selectedKeys}
        style={{float: 'left'}}
        openAnimation="slide-up">
        <SubMenu
          title={
            <span>
              Menu <span className="caret" />
            </span>
          }
          key="view"
          mode="vertical">
          {createViewSubMenuItems()}
        </SubMenu>
        <MenuItem key="view-selected" disabled>
          <Glyphicon glyph={VIEWS[props.view].icon} />
          {VIEWS[props.view].name}
        </MenuItem>
        <Divider />
        <SubMenu
          title={
            <span>
              Topology <span className="caret" />
            </span>
          }
          key="topo"
          mode="vertical">
          {createTopologySubMenuItems()}
        </SubMenu>
        <MenuItem key="topology-selected" disabled>
          {props.networkName ? props.networkName : '-'}
        </MenuItem>
        {props.view === 'map' && createMapSubMenuItems()}
      </Menu>
      <NetworkStatusMenu networkConfig={props.networkConfig} />
    </div>
  );
}

TopBar.propTypes = propTypes;
export default TopBar;
