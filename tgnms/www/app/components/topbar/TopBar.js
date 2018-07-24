/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import PropTypes from 'prop-types';
import React from 'react';
import {Glyphicon} from 'react-bootstrap';
import Menu, {SubMenu, Item as MenuItem, Divider} from 'rc-menu';
import NetworkStatusMenu from './NetworkStatusMenu';
import StatusIndicator from '../common/StatusIndicator';

const propTypes = {
  handleMenuBarSelect: PropTypes.func.isRequired,
  networkName: PropTypes.string.isRequired,
  networkConfig: PropTypes.object.isRequired,
  topologies: PropTypes.arrayOf(PropTypes.object).isRequired,
  view: PropTypes.string.isRequired,
};

// icon: Glyphicon from Bootstrap 3.3.7
const VIEWS = {
  map: {name: 'Map', icon: 'map-marker'},
  dashboards: {name: 'Dashboards', icon: 'dashboard'},
  stats: {name: 'Stats', icon: 'stats'},
  // TODO: implement these views and uncomment them
  // eventlogs: {name: 'Event Logs', icon: 'list'},
  upgrade: {name: 'Upgrade', icon: 'upload'},
  'nms-config': {name: 'NMS Instance Config (Alpha)', icon: 'cloud'},
  config: {name: 'Node Config', icon: 'cog'},
  'e2e-config': {name: 'E2E Config', icon: 'hdd'},
};

const TOPOLOGY_OPS = {
  addSite: 'Add Planned Site',
  addNode: 'Add Node',
  addLink: 'Add Link',
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
      const online =
        topologyConfig.controller_online &&
        !topologyConfig.hasOwnProperty('controller_error');

      return (
        <MenuItem key={keyName}>
          <StatusIndicator online={online} />
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
            Topology Operations <span className="caret" />
          </span>
        }
        key="topOps"
        mode="vertical">
        {Object.keys(TOPOLOGY_OPS).map(topOpsKey => {
          const topOpsName = TOPOLOGY_OPS[topOpsKey];
          return <MenuItem key={'topOps#' + topOpsKey}>{topOpsName}</MenuItem>;
        })}
      </SubMenu>,
      <Divider key={2} />,
      <MenuItem key={'overlays#'}>
        <img className="overlay-image" src={'/static/images/overlays.png'} />
        Site/Link Overlays
      </MenuItem>,
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
              View <span className="caret" />
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
