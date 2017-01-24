import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// side bar
import Sidebar from 'react-sidebar';
// menu
import MetisMenu from 'react-metismenu';
import TopologyMenuItem from './TopologyMenuItem.js';
import PaneMenuItem from './PaneMenuItem.js';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkDashboard from './NetworkDashboard.js';
import NetworkLinkDashboard from './NetworkLinkDashboard.js';
import NetworkMap from './NetworkMap.js';
import EventLogs from './EventLogs.js';
import SystemLogs from './SystemLogs.js';
import NetworkAlerts from './NetworkAlerts.js';
export default class NetworkUI extends React.Component {
  state = {
    view: 'map',
    networkName: null,
    networkConfig: {},
    topologies: {},
    routing: {},
  }

  constructor(props) {
    super(props);
    // register for menu changes
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    // refresh network config
    setInterval(this.getNetworkStatusPeriodic.bind(this), 5000);
  }

  getNetworkStatusPeriodic() {
    if (this.state.networkName != null) {
      this.getNetworkStatus(this.state.networkName);
      this.getAggregatorDump(this.state.networkName);
    }
  }

  getNetworkStatus(networkName) {
    let topoGetFetch = new Request('/topology/get/' +
      networkName);
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
      networkName);
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
        this.refs.topology.changeActiveLinkTo(payload.networkName);
        break;
    }
  }

  refreshTopologyList() {
    let topoListFetch = new Request('/topology/list');
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

  render() {
    // generate menu content
    let paneContent = [];
    // topology selector
    let topologyContent = [];
    paneContent.push({
      icon: 'dashboard',
      label: 'View',
      to: 'view',
      content: [
        {
          icon: 'dashboard',
          label: 'Map',
          to: 'map',
        },
        {
          icon: 'dashboard',
          label: 'Dashboard',
          to: 'dashboard',
        },
        {
          icon: 'dashboard',
          label: 'Link Dashboard',
          to: 'link_dashboard',
        },
        {
          icon: 'dashboard',
          label: 'EventLogs',
          to: 'eventlogs',
        },
        {
          icon: 'dashboard',
          label: 'SystemLogs',
          to: 'systemlogs',
        },
        {
          icon: 'dashboard',
          label: 'Alerts',
          to: 'alerts',
        },
      ],
    });
    let topologyList = [];
    for (let i = 0; i < this.state.topologies.length; i++) {
      let topologyConfig = this.state.topologies[i];
      let menuName = topologyConfig.name;
      let online = topologyConfig.controller_online &&
                   topologyConfig.aggregator_online;
      topologyList.push({
        icon: 'topology',
        label: menuName,
        to: menuName,
      });
   }
    topologyContent.push({
      icon: 'dashboard',
      label: 'Topology',
      to: '#',
      content: topologyList,
    });
    let menu =
      <div>
        <MetisMenu
          content={paneContent}
          LinkComponent={PaneMenuItem}
          activeLinkTo={this.state.view}
          ref="view" />
        <MetisMenu
          content={topologyContent}
          LinkComponent={TopologyMenuItem}
          activeLinkTo={this.state.networkName}
          ref="topology" />
      </div>;
    // select between map + dashboard
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
      case 'link_dashboard':
        paneComponent = <NetworkLinkDashboard />;
        break;
      case 'alerts':
        paneComponent = <NetworkAlerts />;
        break;
      default:
        paneComponent = <NetworkMap />;
    }
    return (
      <Sidebar sidebar={menu}
        open={true}
        sidebarClassName="menu"
        docked={true}>
        {paneComponent}
      </Sidebar>
    );
  }
}
