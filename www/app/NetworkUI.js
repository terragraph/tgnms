import React from 'react';
// menu bar
import Menu, { SubMenu, Item as MenuItem, Divider } from 'rc-menu';
import Modal from 'react-modal';

// leaflet maps
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkDashboard from './NetworkDashboard.js';
import NetworkStats from './NetworkStats.js';
import NetworkMap from './NetworkMap.js';
import EventLogs from './EventLogs.js';
import SystemLogs from './SystemLogs.js';
import NetworkAlerts from './NetworkAlerts.js';

const VIEWS = {
  'map': 'Map',
  'stats': 'Stats',
  'eventlogs': 'Event Logs',
  'systemlogs': 'System Logs',
  'alerts': 'Alerts'
};

const SETTINGS = {
  'overlays': 'Site/Link Overlays'
};

const customModalStyle = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)'
  }
};

const siteOverlayKeys = {
  Health: {
    Healthy: {color: 'green'},
    Unhealthy: {color: 'red'},
    Partial: {color: 'orange'},
		Empty: {color: 'gray'}
  },
  Polarity: {
    Unknown: {color: 'red'},
    Odd: {color: 'blue'},
    Even: {color: 'magenta'},
    Hybrid: {color: 'orange'}
  }
}

const linkOverlayKeys = {
  Health: {
    Healthy: {color: 'green'},
    Unhealthy: {color: 'red'},
    Unknown: {color: 'orange'}
  },
  Uptime: {
    Weighted: {color: 'green'},
    Unknown: {color: 'grey'}
  },
  Snr_Perc: {
    Weighted: {color: 'green'},
    Unknown: {color: 'grey'}
  }
}

export default class NetworkUI extends React.Component {
  state = {
    view: 'map',
    networkName: null,
    networkConfig: {},
    nodesByName: {},
    topologies: {},
    routing: {},
    overlaysModalOpen: false,
    selectedSiteOverlay: 'Health',
    selectedLinkOverlay: 'Health',
  }

  constructor(props) {
    super(props);
    // register for menu changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));

    // refresh network config
    let refresh_interval = CONFIG.refresh_interval ? CONFIG.refresh_interval : 5000;
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
          this.setState({
            networkConfig: json,
          });
          // dispatch the updated topology json
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_REFRESHED,
            networkConfig: json,
          });
        }.bind(this));
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
        break;
      case Actions.TOPOLOGY_SELECTED:
        // update selected topology
        this.getNetworkStatus(payload.networkName);
        this.getAggregatorDump(payload.networkName);
        this.setState({
          networkName: payload.networkName,
        });
        // update active link in menu by setting css selected class
        break;
      case Actions.TOPOLOGY_REFRESHED:
        let nodesByName = {};
        payload.networkConfig.topology.nodes.forEach(node => {
          nodesByName[node.name] = node;
        });
        // update node name mapping
        this.setState({
          nodesByName: nodesByName,
        });
        // update link health
        this.updateNetworkLinkHealth(this.state.networkName);
    }
  }

  updateNetworkLinkHealth(networkName) {
    // refresh link health
    let linkHealthFetch = new Request('/health/' + networkName, {"credentials": "same-origin"});
    fetch(linkHealthFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          Dispatcher.dispatch({
            actionType: Actions.HEALTH_REFRESHED,
            health: json,
          });
        }.bind(this));
      }
    }.bind(this));
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
      topologies: {},
    });
    // fetch topology config
    this.refreshTopologyList();
    // refresh every 10 seconds
    setInterval(this.refreshTopologyList.bind(this), 10000);
  }

  handleMenuBarSelect(info) {
    if (info.key.indexOf('.')) {
      let keySplit = info.key.split('.');
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
          this.setState({overlaysModalOpen: true});
          break;
      }
    }
  }

  overlaysModalClose() {
    this.setState({overlaysModalOpen: false});
  }

  getOverlaysModal(): ReactElement<any> {
    let siteOverlayKeyRows = [];
    let siteOverlaySource = siteOverlayKeys[this.state.selectedSiteOverlay];
    Object.keys(siteOverlaySource).map(siteState => {
      siteOverlayKeyRows.push(
      <tr key={siteState}>
        <td></td>
        <td>
          <font color={siteOverlaySource[siteState].color}> {siteState} </font>
        </td>
      </tr>);
    });
    let linkOverlayKeyRows = [];
    let linkOverlaySource = linkOverlayKeys[this.state.selectedLinkOverlay];
    Object.keys(linkOverlaySource).map(linkState => {
      linkOverlayKeyRows.push(
      <tr key={linkState}>
        <td></td>
        <td>
          <font color={linkOverlaySource[linkState].color}> {linkState} </font>
        </td>
      </tr>);
    });

    return (
      <Modal
          isOpen={this.state.overlaysModalOpen}
          onRequestClose={this.overlaysModalClose.bind(this)}
          style={customModalStyle}
          contentLabel="Example Modal">
        <table>
          <tbody>
          <tr>
            <td width={100}>Site Overlay</td>
            <td width={100}>
              <div style={{width:100}}>
                <select
                  style={{width:100}}
                  value={this.state.selectedSiteOverlay}
                  onChange={ (ev) => { this.setState({ selectedSiteOverlay: ev.currentTarget.value }); } }
                >
                  {Object.keys(siteOverlayKeys).map(overlay => (<option key={ overlay } value={ overlay }>{ overlay }</option>)) }
                </select>
              </div>
            </td>
          </tr>
          {siteOverlayKeyRows}
          <tr className="blank_row">
          </tr>
          <tr>
            <td width={100}>Link Overlay</td>
            <td width={100}>
              <div style={{width:100}}>
                <select
                  style={{width:100}}
                  value={this.state.selectedLinkOverlay}
                  onChange={ (ev) => { this.setState({ selectedLinkOverlay: ev.currentTarget.value }); } }
                >
                  {Object.keys(linkOverlayKeys).map(overlay => (<option key={ overlay } value={ overlay }>{ overlay }</option>)) }
                </select>
              </div>
            </td>
          </tr>
          {linkOverlayKeyRows}
          </tbody>
        </table>
        <button style={{float: 'right'}} className='graph-button' onClick={this.overlaysModalClose.bind(this)}>close</button>
      </Modal>);
  }

  render() {
    let topologyMenuItems = [];
    for (let i = 0; i < this.state.topologies.length; i++) {
      let topologyConfig = this.state.topologies[i];
      let keyName = "topo." + topologyConfig.name;
      let online = topologyConfig.controller_online ||
                   topologyConfig.aggregator_online;
      topologyMenuItems.push(
        <MenuItem key={keyName}>
          <img src={"/static/images/" + (online ? 'online' : 'offline') + ".png"} />
          {topologyConfig.name}
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
    // select between view panes
    let paneComponent = <div/>;
    switch (this.state.view) {
      case 'dashboard':
        paneComponent = <NetworkDashboard />;
        break;
      case 'eventlogs':
        paneComponent = <EventLogs />;
        break;
      case 'systemlogs':
        paneComponent = <SystemLogs />;
        break;
      case 'stats':
        paneComponent = <NetworkStats />;
        break;
      case 'alerts':
        paneComponent = <NetworkAlerts />;
        break;
      default:
        paneComponent =
        <NetworkMap
          linkOverlay={this.state.selectedLinkOverlay}
          linkOverlayKeys={linkOverlayKeys}
          siteOverlay={this.state.selectedSiteOverlay}
          siteOverlayKeys={siteOverlayKeys}
        />;
    }
    // add all selected keys
    let selectedKeys = ["view." + this.state.view];
    if (this.state.networkName) {
      selectedKeys.push("topo." + this.state.networkName);
    }

    let overlaysModal = this.getOverlaysModal();

    return (
      <div>
        {overlaysModal}
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
                  <MenuItem key={"view." + viewKey}>
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
                  <MenuItem key={"settings." + settingKey}>
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
