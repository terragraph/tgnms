import React from 'react';
// menu bar
import Menu, { SubMenu, Item as MenuItem, Divider } from 'rc-menu';
// leaflet maps
import { render } from 'react-dom';
// dispatcher
import { Actions } from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';

import NetworkStats from './NetworkStats.js';
import NetworkDashboards from './NetworkDashboards.js';
import NetworkMap from './NetworkMap.js';
import EventLogs from './EventLogs.js';
import SystemLogs from './SystemLogs.js';
import NetworkAlerts from './NetworkAlerts.js';
import NetworkConfig from './NetworkConfig.js';
import ModalOverlays from './ModalOverlays.js';
import ModalTopology from './ModalTopology.js';
import {SiteOverlayKeys, linkOverlayKeys} from './NetworkConstants.js';

const VIEWS = {
  'map': 'Map',
  'dashboards': 'Dashboards',
  'stats': 'Stats',
  'eventlogs': 'Event Logs',
  'systemlogs': 'System Logs',
  'alerts': 'Alerts',
  'config': 'Config (Alpha)',
};

const SETTINGS = {
  'overlays': 'Site/Link Overlays',
  'topology': 'Topology Operations',
};


export default class NetworkUI extends React.Component {
  state = {
    view: NetworkStore.viewName,
    networkName: NetworkStore.networkName,
    networkConfig: {},
    nodesByName: {},
    topologies: [],
    routing: {},
    overlaysModalOpen: false,
    topologyModalOpen: false,
    selectedSiteOverlay: 'Health',
    selectedLinkOverlay: 'Health',
    topology: {},
  }

  constructor(props) {
    super(props);
    // register for menu changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    // refresh network config
    let refresh_interval = CONFIG.refresh_interval ? CONFIG.refresh_interval :
                                                     5000;
    // load data if network name known
    this.getNetworkStatusPeriodic();
    setInterval(this.getNetworkStatusPeriodic.bind(this), refresh_interval);
  }

  getNetworkStatusPeriodic() {
    if (this.state.networkName != null) {
      this.getNetworkStatus(this.state.networkName);
      this.getAggregatorDump(this.state.networkName);
    }
  }

  getNetworkStatus(networkName) {
    let topoGetFetch = new Request('/topology/get/' +
      networkName, {"credentials": "same-origin"});
    fetch(topoGetFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          // TODO: normalize the topology with health data if it exists
          this.setState({
            networkConfig: json,
          });
          // dispatch the updated topology json
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_REFRESHED,
            networkConfig: json,
          });
        }.bind(this));
      } else if (response.status == 404) {
        // topology is invalid, switch to the first topology in the list
        if (this.state.topologies.length) {
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_SELECTED,
            networkName: this.state.topologies[0].name,
          });
        }
      }
    }.bind(this));
  }

  getAggregatorDump(networkName) {
    let aggregatorDumpFetch = new Request('/aggregator/getStatusDump/' +
      networkName, {"credentials": "same-origin"});
    fetch(aggregatorDumpFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            routing: json,
          });
          // dispatch the updated topology json
          Dispatcher.dispatch({
            actionType: Actions.AGGREGATOR_DUMP_REFRESHED,
            routing: json,
          });
        }.bind(this));
      }
    }.bind(this));
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case Actions.VIEW_SELECTED:
        let viewName = payload.viewName;
        // ignore the menu
        if (viewName == '#') {
          break;
        }
        this.setState({
          view: viewName,
        });
        // construct new URL from selected view
        break;
      case Actions.TOPOLOGY_SELECTED:
        // update selected topology
        this.getNetworkStatus(payload.networkName);
        this.getAggregatorDump(payload.networkName);
        this.setState({
          networkName: payload.networkName,
        });
        // update the browser URL history
        break;
      case Actions.TOPOLOGY_REFRESHED:
        let nodesByName = {};
        payload.networkConfig.topology.nodes.forEach(node => {
          nodesByName[node.name] = node;
        });
        // update node name mapping
        this.setState({
          nodesByName: nodesByName,
          topology: payload.networkConfig.topology,
        });
        // update link health
        this.updateNetworkLinkHealth(this.state.networkName);
        this.updateLinkOverlayStat(this.state.networkName);
        break;
    }
  }

  updateNetworkLinkHealth(networkName) {
    // refresh link health
    let linkHealthFetch = new Request('/health/' + networkName, {"credentials": "same-origin"});
    fetch(linkHealthFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          // merge data
          Dispatcher.dispatch({
            actionType: Actions.HEALTH_REFRESHED,
            health: json,
          });
        }.bind(this));
      }
    }.bind(this));
  }

  updateLinkOverlayStat(networkName) {
    if (this.state.selectedLinkOverlay) {
      let overlaySource = linkOverlayKeys[this.state.selectedLinkOverlay];
      let metric = overlaySource.metric;

      if (metric) {
        // refresh link overlay stat
        let linkHealthFetch = new Request('/overlay/linkStat/' + networkName + '/' + metric, {"credentials": "same-origin"});
        fetch(linkHealthFetch).then(function(response) {
          if (response.status == 200) {
            response.json().then(function(json) {
              Dispatcher.dispatch({
                actionType: Actions.LINK_OVERLAY_REFRESHED,
                overlay: json[0],
              });
            }.bind(this));
          }
        }.bind(this));
      }
    }
  }

  refreshTopologyList() {
    // topology list
    let topoListFetch = new Request('/topology/list',
      {"credentials": "same-origin"});
    fetch(topoListFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            topologies: json,
          });
          // dispatch the whole network topology struct
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_LIST_REFRESHED,
            topologies: json,
          });
          // select the first topology by default
          if (!this.state.networkName && this.state.topologies.length) {
            Dispatcher.dispatch({
              actionType: Actions.TOPOLOGY_SELECTED,
              networkName: this.state.topologies[0].name,
            });
          }
        }.bind(this));
      }
    }.bind(this));
  }

  componentWillMount() {
    this.setState({
      topologies: [],
    });
    // fetch topology config
    this.refreshTopologyList();
    // refresh every 10 seconds
    setInterval(this.refreshTopologyList.bind(this), 10000);
  }

  handleMenuBarSelect(info) {
    if (info.key.indexOf('#') > -1) {
      let keySplit = info.key.split('#');
      switch (keySplit[0]) {
        case 'view':
          Dispatcher.dispatch({
            actionType: Actions.VIEW_SELECTED,
            viewName: keySplit[1],
          });
          break;
        case 'topo':
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_SELECTED,
            networkName: keySplit[1],
          });
          break;
        case 'settings':
          if (keySplit[1] == 'overlays') {
            this.setState({overlaysModalOpen: true});
          } else if (keySplit[1] == 'topology') {
            this.setState({topologyModalOpen: true});
          }
          break;
      }
    }
  }

  overlaysModalClose(siteOverlay, linkOverlay) {
    this.setState({
      overlaysModalOpen: false,
      selectedSiteOverlay: siteOverlay,
      selectedLinkOverlay: linkOverlay,
    });
    Dispatcher.dispatch({
      actionType: Actions.LINK_OVERLAY_REFRESHED,
      overlay: null,
    });
  }

  render() {
    let topologyMenuItems = [];
    for (let i = 0; i < this.state.topologies.length; i++) {
      let topologyConfig = this.state.topologies[i];
      let keyName = "topo#" + topologyConfig.name;
      let online = topologyConfig.controller_online ||
                   topologyConfig.aggregator_online;
      let controllerErrorMsg;
      if (topologyConfig.hasOwnProperty('controller_error')) {
        online = false;
        controllerErrorMsg =
          <span style={{color: 'red', fontWeight: 'bold'}}>
            (Error)
          </span>;
      }
      topologyMenuItems.push(
        <MenuItem key={keyName}>
          <img src={"/static/images/" + (online ? 'online' : 'offline') + ".png"} />
          {topologyConfig.name}{controllerErrorMsg}
        </MenuItem>
      );
    }
    let networkStatusMenuItems = [];
    if (this.state.networkConfig && this.state.networkConfig.topology) {
      const topology = this.state.networkConfig.topology;
      let linksOnline = topology.links.filter(link =>
          link.link_type == 1 && link.is_alive).length;
      let linksWireless = topology.links.filter(link =>
          link.link_type == 1).length;
      // online + online initiator
      let sectorsOnline = topology.nodes.filter(node =>
          node.status == 2 || node.status == 3).length;
      networkStatusMenuItems = [
        <MenuItem key="e2e-status" disabled>
          <img src={"/static/images/" +
            (this.state.networkConfig.controller_online ? 'online' : 'offline') + ".png"} />
          E2E
        </MenuItem>,
        <Divider key= "status-divider" />,
        <MenuItem key="nms-status" disabled>
          <img src={"/static/images/" +
            (this.state.networkConfig.aggregator_online ? 'online' : 'offline') + ".png"} />
          NMS
        </MenuItem>,
        <Divider key="site-divider" />,
        <MenuItem key="site-status" disabled>
          {topology.sites.length} Sites
        </MenuItem>,
        <Divider key="sector-divider" />,
        <MenuItem key="sector-status" disabled>
          {sectorsOnline}/{topology.nodes.length} Sectors
        </MenuItem>,
        <Divider key="link-divider" />,
        <MenuItem key="link-status" disabled>
          {linksOnline}/{linksWireless} Links
        </MenuItem>
      ];
    }
    // don't load components without topology config
    if (!this.state.networkName ||
        !this.state.networkConfig ||
        !this.state.networkConfig.topology ||
        !this.state.networkConfig.topology.sites ||
        !this.state.networkConfig.topology.nodes) {
      return (
        <div style={{float: 'left', width: '100%', margin: '5px'}}>
          <img src='/static/images/loading-graphs.gif' />
        </div>
      );
    }
    // select between view panes
    let viewProps = {
      networkName: this.state.networkName,
      networkConfig: this.state.networkConfig,
      config: this.state.topologies,
    };
    let paneComponent = <div/>;
    switch (this.state.view) {
      case 'eventlogs':
        paneComponent = <EventLogs {...viewProps} />;
        break;
      case 'systemlogs':
        paneComponent = <SystemLogs {...viewProps} />;
        break;
      case 'dashboards':
        paneComponent = <NetworkDashboards {...viewProps} />;
        break;
      case 'stats':
        paneComponent = <NetworkStats {...viewProps} />;
        break;
      case 'alerts':
        paneComponent = <NetworkAlerts {...viewProps} />;
        break;
      case 'config':
        paneComponent = <NetworkConfig {...viewProps} />;
        break;
      default:
        paneComponent =
        <NetworkMap
          {...viewProps}
          linkOverlay={this.state.selectedLinkOverlay}
          siteOverlay={this.state.selectedSiteOverlay}
        />;
    }
    // add all selected keys
    let selectedKeys = ["view#" + this.state.view];
    if (this.state.networkName) {
      selectedKeys.push("topo#" + this.state.networkName);
    }

    return (
      <div>
        <ModalOverlays
          isOpen= {this.state.overlaysModalOpen}
          selectedSiteOverlay= {this.state.selectedSiteOverlay}
          selectedLinkOverlay= {this.state.selectedLinkOverlay}
          onClose= {this.overlaysModalClose.bind(this)}/>
        <ModalTopology
          isOpen= {this.state.topologyModalOpen}
          onClose= {() => this.setState({topologyModalOpen: false})}
          topology= {this.state.topology}/>

        <div className="top-menu-bar">
          <Menu
              onSelect={this.handleMenuBarSelect.bind(this)}
              mode="horizontal"
              selectedKeys={selectedKeys}
              style={{float: 'left'}}>
            <SubMenu title="View" key="view" mode="vertical">
              {Object.keys(VIEWS).map(viewKey => {
                let viewName = VIEWS[viewKey];
                return (
                  <MenuItem key={"view#" + viewKey}>
                    <img src={"/static/images/" + viewKey + ".png"} />
                    {viewName}
                  </MenuItem>);
              })}
            </SubMenu>
            <MenuItem key="view-selected" disabled>
              <img src={"/static/images/" + this.state.view + ".png"} />
              {VIEWS[this.state.view]}
            </MenuItem>
            <Divider />
            <SubMenu title="Topology" key="topo" mode="vertical">
              {topologyMenuItems}
            </SubMenu>
            <MenuItem key="topology-selected" disabled>
              {this.state.networkName ? this.state.networkName : '-'}
            </MenuItem>
            <Divider />
            <SubMenu title="Settings" key="settings" mode="vertical">
              {Object.keys(SETTINGS).map(settingKey => {
                let settingName = SETTINGS[settingKey];
                return (
                  <MenuItem key={"settings#" + settingKey}>
                    <img src={"/static/images/" + settingKey + ".png"} />
                    {settingName}
                  </MenuItem>);
              })}
            </SubMenu>
            <Divider />
          </Menu>
          <Menu mode="horizontal" style={{float: 'right'}}>
            {networkStatusMenuItems}
          </Menu>
        </div>
        <div>
          {paneComponent}
        </div>
      </div>
    );
  }
}
