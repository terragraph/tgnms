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
import NetworkMap from './NetworkMap.js';

export default class NetworkUI extends React.Component {
  state = {
    view: 'map',
    topologyName: null,
    topologyJson: {},
    topologies: {},
    routing:{},
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
    if (this.state.topologyName != null) {
      this.getNetworkStatus(this.state.topologyName);
      this.getAggregatorDump(this.state.topologyName);
    }
  }

  getNetworkStatus(topologyName) {
    let topoGetFetch = new Request('/topology/get/' +
      topologyName);
    fetch(topoGetFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            topologyJson: json,
          });
          // dispatch the updated topology json
          Dispatcher.dispatch({
            actionType: Actions.TOPOLOGY_REFRESHED,
            topologyJson: json,
          });
        }.bind(this));
      }
    }.bind(this));
  }

  getAggregatorDump(topologyName) {
    let aggregatorDumpFetch = new Request('/aggregator/get/' +
      topologyName);
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
        this.getNetworkStatus(payload.topologyName);
        this.getAggregatorDump(payload.topologyName);
        this.setState({
          topologyName: payload.topologyName,
        });
        // update active link in menu by setting css selected class
        this.refs.topology.changeActiveLinkTo(payload.topologyName);
        break;
    }
  }

  componentWillMount() {
    this.setState({
      topologies: {},
    });
    // fetch topology config
    let topoListFetch = new Request('/topology/list');
    fetch(topoListFetch).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            topologies: json,
          });
        }.bind(this));
      }
    }.bind(this));
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
      ],
    });
    let topologyList = [];
    for (let i = 0; i < this.state.topologies.length; i++) {
      let menuName = this.state.topologies[i].name;
      topologyList.push({
        icon: 'dashboard',
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
          activeLinkTo={this.state.topologyName}
          ref="topology" />
      </div>;
    // select between map + dashboard
    let paneComponent = <div/>;
    switch (this.state.view) {
      case 'dashboard':
        paneComponent = <NetworkDashboard />;
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
