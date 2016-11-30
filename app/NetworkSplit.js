import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// graphs
import styles from './App.css';
// side bar
import Sidebar from 'react-sidebar';
// menu
import MetisMenu from 'react-metismenu';
import TopologyConfigItem from './TopologyConfigItem.js';
// dispatcher
import Dispatcher from './MapDispatcher.js';
import NetworkDashboard from './NetworkDashboard.js';
import NetworkMap from './NetworkMap.js';

export default class NetworkSplit extends React.Component {
  constructor(props) {
    super(props);
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
    let menuContent = [];
    for (let i = 0; i < this.state.topologies.length; i++) {
      let menuName = this.state.topologies[i].name;
      menuContent.push({
        icon: 'dashboard',
        label: menuName,
        to: menuName,
      });
    }
    let menu =
      <div>
        Select a topology
        <MetisMenu content={menuContent} LinkComponent={TopologyConfigItem} />
      </div>;
    // select between map + dashboard
    return (
      <Sidebar sidebar={menu}
        open={true}
        sidebarClassName="menu"
        docked={true}>
        {this.props.children}
      </Sidebar>
    );
  }
}
