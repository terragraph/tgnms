/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import moment from 'moment';
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
  networkTests: PropTypes.array.isRequired,
  selectedNetworkTest: PropTypes.number,
  topologies: PropTypes.arrayOf(PropTypes.object).isRequired,
  user: PropTypes.object,
  view: PropTypes.string.isRequired,
};

const TOPOLOGY_OPS = {
  addLink: {icon: 'transfer', name: 'New Link'},
  addNode: {icon: 'asterisk', name: 'New Node'},
  addSite: {icon: 'pushpin', name: 'New Planned Site'},
};

export default class TopBar extends React.Component {
  createViewSubMenuItems() {
    return Object.keys(VIEWS).map(viewKey => (
      <MenuItem key={'view#' + viewKey}>
        <Glyphicon glyph={VIEWS[viewKey].icon} />
        {VIEWS[viewKey].name}
      </MenuItem>
    ));
  }

  createTopologySubMenuItems() {
    return this.props.topologies.map(topologyConfig => {
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

  createMapSubMenuItems() {
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
      <Divider key={3} />,
      <SubMenu
        title={
          <span>
            Tests <span className="caret" />
          </span>
        }
        key="networkTest"
        mode="vertical">
        <MenuItem key={'test#new'}>
          <Glyphicon glyph={'new-window'} />
          Start Test
        </MenuItem>
        {this.props.networkTests.map(networkTest => {
          const timeAgo = moment(networkTest.start_date).fromNow();
          const networkTestStatusIcon = {
            1: 'hourglass', // running
            2: 'ok', // finished
            3: 'remove', // aborted
          };
          const statusIcon = networkTestStatusIcon.hasOwnProperty(
            networkTest.status,
          )
            ? networkTestStatusIcon[networkTest.status]
            : 'wrench';
          return (
            <MenuItem key={'test#' + networkTest.id}>
              <Glyphicon glyph={statusIcon} />
              Network Single-Hop #{networkTest.id} ({timeAgo})
            </MenuItem>
          );
        })}
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

  render() {
    const {networkConfig, networkName, selectedNetworkTest, view} = this.props;
    // Create list of selected keys
    const selectedKeys = ['view#' + view];
    if (networkName) {
      selectedKeys.push('topo#' + networkName);
    }
    if (selectedNetworkTest) {
      selectedKeys.push('test#' + selectedNetworkTest);
    }
    // NOTE: Can't create components for these functions because the <Menu />
    // creates refs for these submenu items which creates weird errors

    return (
      <div className="top-menu-bar">
        <Menu
          onSelect={this.props.handleMenuBarSelect}
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
            {this.createViewSubMenuItems()}
          </SubMenu>
          <MenuItem key="view-selected" disabled>
            <Glyphicon glyph={VIEWS[view].icon} />
            {VIEWS[view].name}
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
            {this.createTopologySubMenuItems()}
          </SubMenu>
          <MenuItem key="topology-selected" disabled>
            {networkName ? networkName : '-'}
          </MenuItem>
          {view === 'map' && this.createMapSubMenuItems()}
        </Menu>
        <NetworkStatusMenu networkConfig={networkConfig} />
      </div>
    );
  }
}

TopBar.propTypes = {
  handleMenuBarSelect: PropTypes.func.isRequired,
  networkConfig: PropTypes.object.isRequired,
  networkName: PropTypes.string.isRequired,
  networkTests: PropTypes.array.isRequired,
  selectedNetworkTest: PropTypes.number,
  topologies: PropTypes.arrayOf(PropTypes.object).isRequired,
  user: PropTypes.object,
  view: PropTypes.string.isRequired,
};
