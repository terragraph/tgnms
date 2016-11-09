import React from 'react';
// leaflet maps
import { render } from 'react-dom';
import Leaflet from 'leaflet';
import { Map, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
// graphs
import MetricGraph from './MetricGraph.js';
import styles from './App.css';
// side bar
import Sidebar from 'react-sidebar';
// menu
import MetisMenu from 'react-metismenu';
import TopologyConfigItem from './TopologyConfigItem.js';
// dispatcher
import Dispatcher from './MapDispatcher.js';

export default class NetworkMap extends React.Component {
  constructor(props) {
    super(props);
    this.dispatchToken = Dispatcher.register(this.handleDispatchEvent.bind(this));
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case 'topologySelected':
        // update selected
        let topoGetFetch = new Request('/topology/get/' + payload.topologyName);
        fetch(topoGetFetch).then(function(response) {
          if (response.status == 200) {
            response.json().then(function(json) {
              this.setState({
                topology: json
              });
            }.bind(this));
          }
        }.bind(this));
        break;
    }
  }

  componentWillMount() {
    this.setState({
      topologies: {},
      topology: {},
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
    const position = [37.484494, -122.1483976];
    // generate menu content
    let menuContent = [];
    for (let i = 0; i < this.state.topologies.length; i++) {
      let menuName = this.state.topologies[i];
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
    let siteComponents = [];
    let linkComponents = [];
    if (this.state.topology.topology && this.state.topology.topology.sites) {
      // index nodes by name
      let nodesByName = {};
      Object.keys(this.state.topology.topology.nodes).map(nodeIndex => {
        let node = this.state.topology.topology.nodes[nodeIndex];
        nodesByName[node.name] = node;
      });
      let sitesByName = {};
      Object.keys(this.state.topology.topology.sites).map(siteIndex => {
        let site = this.state.topology.topology.sites[siteIndex];
        sitesByName[site.name] = site;
      });
      // sites
      let siteIcon = Leaflet.icon({
        iconUrl: '/static/images/unknown.png',
        iconSize: [15, 17],
        iconAnchor: [7, 8],
      });
      Object.keys(this.state.topology.topology.sites).map(siteName => {
        let site = this.state.topology.topology.sites[siteName];
        let siteCoords = [site.latitude, site.longitude];
        // show all nodes
        siteComponents.push(
          <Marker
            icon={siteIcon}
            key={siteName}
            position={siteCoords}>
            <Popup>
              <div>
                Some nodes here..
                <MetricGraph
                  title="terra111.f1.xx"
                  node="00:00:00:10:0c:40"
                  metric="bandwidth"
                />
              </div>
            </Popup>
          </Marker>
        );
      });
      Object.keys(this.state.topology.topology.links).map(linkName => {
        let link = this.state.topology.topology.links[linkName];
        if (link.link_type != 1) {
          return;
        }
        let aNode = sitesByName[nodesByName[link.a_node_name].site_name];
        let zNode = sitesByName[nodesByName[link.z_node_name].site_name]
        const linkCoords = [
          [aNode.latitude, aNode.longitude],
          [zNode.latitude, zNode.longitude],
        ];
        linkComponents.push(
          <Polyline
            key={link.name}
            positions={linkCoords}
            />
        );
      });
    }
    return (
        <Sidebar sidebar={menu}
          open={true}
          sidebarClassName="menu"
          docked={true}>
          <Map center={position} zoom={18}>
            <TileLayer
              url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            {siteComponents}
            {linkComponents}
          </Map>
        </Sidebar>
    );
  }
}
