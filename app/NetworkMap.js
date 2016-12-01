import React from 'react';
// leaflet maps
import { render } from 'react-dom';
import Leaflet from 'leaflet';
import { Map, Marker, Polyline, Popup, TileLayer, Circle} from 'react-leaflet';
// graphs
import MetricGraph from './MetricGraph.js';
import styles from './App.css';
// dispatcher
import Dispatcher from './MapDispatcher.js';

import SplitPane from 'react-split-pane';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

// markers to show health of sectors on a site
const UNKNOWN_MARKER = Leaflet.icon({
  // exclamation point
  iconUrl: '/static/images/unknown.png',
  iconSize: [15, 17],
  iconAnchor: [7, 8],
});
const UNHEALTHY_MARKER = Leaflet.icon({
  // fire
  iconUrl: '/static/images/unhealthy.png',
  iconSize: [15, 17],
  iconAnchor: [7, 8],
});
const HEALTHY_MARKER = Leaflet.icon({
  // check mark
  iconUrl: '/static/images/healthy.png',
  iconSize: [15, 17],
  iconAnchor: [7, 8],
});

export default class NetworkMap extends React.Component {
  state = {
    selectedNode: null,
    selectedLink: null,
    zoomLevel: 18,
    tableHeight: window.innerHeight/2 - 50,
  };

  constructor(props) {
    super(props);
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
  }

  _getNodesRows(nodes): Array<{name:string,
                          mac_addr:string,
                          node_type:string,
                          ignited:boolean,
                          site_name:string,
                          pop_node:string,
                          ipv6:string,
                          version:string}>  {
    const rows = [];
    Object.keys(nodes).forEach(nodeName => {
      let node = nodes[nodeName];
      var ipv6 = node.status ? node.status.ipv6Address : 'Not Available';
      var version = node.status ? node.status.version.slice(28) : 'Not Available';
      rows.push(
        {
          name: node.name,
          mac_addr: node.mac_addr,
          node_type: node.node_type == 2 ? 'DN' : 'CN',
          ignited: node.is_ignited,
          site_name: node.site_name,
          pop_node: node.pop_node ? 'true' : 'false',
          ipv6: ipv6,
          version: version,
          key: node.name,
        },
      );
    });
    return rows;
  }

  _getLinksRows(links): Array<{name:string,
                          a_node_name:string,
                          z_node_name:string,
                          alive:boolean}> {
    const rows = [];
    links.forEach(link => {
      rows.push(
        {
          name: link.name,
          a_node_name: link.a_node_name,
          z_node_name: link.z_node_name,
          alive: link.is_alive,
          type: link.link_type == 1 ? 'Wireless' : 'Wired',
          key: link.name,
        },
      );
    });
    return rows;
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      case 'topologySelected':
        self = this;
        function getNetworkStatus() {
          let topoGetFetch = new Request('/topology/get/' +
              payload.topologyName);
          fetch(topoGetFetch).then(function(response) {

            if (response.status == 200) {
              response.json().then(function(json) {
                // index nodes by name
                let nodesByName = {};
                Object.keys(json.nodes).map(nodeIndex => {
                  let node = json.nodes[nodeIndex];
                  nodesByName[node.name] = node;
                });
                let sitesByName = {};
                Object.keys(json.sites).map(siteIndex => {
                  let site = json.sites[siteIndex];
                  sitesByName[site.name] = site;
                });
                self.setState({
                  topology: json,
                  topologyName: payload.topologyName,
                  nodesTableData: self._getNodesRows(json.nodes),
                  linksTableData: self._getLinksRows(json.links),
                  nodesByName: nodesByName,
                  sitesByName: sitesByName,
                });
              }.bind(self));
            }
          }.bind(self));
        }

        if (this.state.intervalId) {
          clearInterval(this.state.intervalId);
        }
        getNetworkStatus();
        var intervalId = setInterval(getNetworkStatus, 2000);
        this.setState({intervalId: intervalId});
        break;
    }
  }

  componentWillMount() {
    this.setState({
      topology: {},
      nodesTableData: [],
    });
  }

  componentDidMount() {
    this.refs.map.leafletElement.invalidateSize();
  }

  _nodesOnRowSelect(row, isSelected){
    this.setState({
      selectedNode: row,
      selectedLink: null,
    });
  }

  _linksOnRowSelect(row, isSelected){
    this.setState({
      selectedNode: null,
      selectedLink:  row,
    });
  }

  _handleTabSelect(index, last) {
    this.setState({
      selectedTabIndex: index,
      selectedNode: null,
      selectedLink: null,
    });
  }

  _onMapZoom(data){
    this.setState({
      zoomLevel: data.target._zoom,
    });
  }

  _paneChange(newSize) {
    this.refs.map.leafletElement.invalidateSize();
    this.setState({
      tableHeight: window.innerHeight - newSize - 50,
    });
  }

  render() {
    const centerPosition = [37.484494, -122.1483976];
    let siteComponents = [];
    let linkComponents = [];
    if (this.state.topology && this.state.topology.sites) {
      Object.keys(this.state.topology.sites).map(siteIndex => {
        let site = this.state.topology.sites[siteIndex];
        if (!site.location) {
          site.location = {};
          site.location.latitude = 0;
          site.location.longitude = 0;
        }
        let siteCoords = [site.location.latitude, site.location.longitude];

        let healthyCount = 0;
        let totalCount = 0;
        Object.keys(this.state.topology.nodes).map(nodeIndex => {
          let node = this.state.topology.nodes[nodeIndex];
          if (node.site_name == site.name) {
            totalCount++;
            healthyCount += node.is_ignited ? 1 : 0;
          }
        });

        let contextualMarker = UNKNOWN_MARKER;
        if (totalCount == healthyCount) {
          contextualMarker = HEALTHY_MARKER;
        } else if (healthyCount == 0) {
          contextualMarker = UNHEALTHY_MARKER;
        }

        // show all nodes
        siteComponents.push(
          <Marker
            icon={contextualMarker}
            key={siteIndex}
            position={siteCoords}>
            <Popup>
              <div>
                Some nodes here..
              </div>
            </Popup>
          </Marker>
        );
      });
      Object.keys(this.state.topology.links).map(linkName => {
        let link = this.state.topology.links[linkName];
        if (link.link_type != 1) {
          return;
        }
        let aNodeSite = this.state.sitesByName[this.state.nodesByName[link.a_node_name].site_name];
        let zNodeSite = this.state.sitesByName[this.state.nodesByName[link.z_node_name].site_name];

        if (!aNodeSite.location || !zNodeSite.location) {
          return;
        }

        const linkCoords = [
          [aNodeSite.location.latitude, aNodeSite.location.longitude],
          [zNodeSite.location.latitude, zNodeSite.location.longitude],
        ];
        var color = link.is_alive ? 'green' : 'blue';
        linkComponents.push(
          <Polyline
            key={link.name}
            positions={linkCoords}
            color={color}
            />
        );
      });
    }

    let siteMarkers = [];
    if (this.state.selectedNode != null) {
      let site = this.state.sitesByName[this.state.selectedNode.site_name];
      if (site && site.location) {
        siteMarkers =
          <Circle center={[site.location.latitude, site.location.longitude]}
                  radius={4 * Math.pow(2, 19 - this.state.zoomLevel)}
                  color='red'/>;
      }
    } else if (this.state.selectedLink != null) {
      let node_a = this.state.nodesByName[this.state.selectedLink.a_node_name];
      let node_z = this.state.nodesByName[this.state.selectedLink.z_node_name];
      if (node_a && node_z) {
        let site_a = this.state.sitesByName[node_a.site_name];
        let site_z = this.state.sitesByName[node_z.site_name];
        if (site_a && site_z && site_a.location && site_z.location) {
          siteMarkers = [
            <Circle center={[site_a.location.latitude, site_a.location.longitude]}
                    radius={4 * Math.pow(2, 19 - this.state.zoomLevel)}
                    color='red'/>,
            <Circle center={[site_z.location.latitude, site_z.location.longitude]}
                    radius={4 * Math.pow(2, 19 - this.state.zoomLevel)}
                    color='red'/>];
        }
      }
    }

    var nodesSelectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(238, 193, 213)",
      onSelect: this._nodesOnRowSelect.bind(this)
    };

    var linksSelectRowProp = {
      mode: "radio",
      clickToSelect: true,
      hideSelectColumn: true,
      bgColor: "rgb(238, 193, 213)",
      onSelect: this._linksOnRowSelect.bind(this)
    };

    return (
      <div>
        <SplitPane
          split="horizontal"
          defaultSize="50%"
          onChange={this._paneChange.bind(this)}>
          <Map
            ref='map'
            onZoom={this._onMapZoom.bind(this)}
            center={centerPosition} zoom={18}>
            <TileLayer
              url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            {siteComponents}
            {linkComponents}
            {siteMarkers}
          </Map>
          <Tabs
            onSelect={this._handleTabSelect.bind(this)}
            selectedIndex={this.state.selectedTabIndex}
          >
            <TabList>
              <Tab>Nodes</Tab>
              <Tab>Links</Tab>
              <Tab>Test</Tab>
            </TabList>
            <TabPanel>
              <BootstrapTable
                  height={this.state.tableHeight + 'px'}
                  key="nodesTable"
                  data={this.state.nodesTableData}
                  striped={true} hover={true}
                  selectRow={nodesSelectRowProp}>
                <TableHeaderColumn width="180" dataSort={true} dataField="name" isKey={ true }>Name</TableHeaderColumn>
                <TableHeaderColumn width="170" dataSort={true} dataField="mac_addr">MAC</TableHeaderColumn>
                <TableHeaderColumn width="180" dataSort={true} dataField="ipv6">IPv6</TableHeaderColumn>
                <TableHeaderColumn width="80" dataSort={true} dataField="node_type">Type</TableHeaderColumn>
                <TableHeaderColumn width="80" dataSort={true} dataField="ignited">Ignited</TableHeaderColumn>
                <TableHeaderColumn width="80" dataSort={true} dataField="site_name">Site ID</TableHeaderColumn>
                <TableHeaderColumn width="100" dataSort={true} dataField="pop_node">Pop Node</TableHeaderColumn>
                <TableHeaderColumn dataSort={true} dataField="version">Version</TableHeaderColumn>
              </BootstrapTable>
            </TabPanel>
            <TabPanel>
              <BootstrapTable
                  height={this.state.tableHeight + 'px'}
                  key="linksTable"
                  data={this.state.linksTableData}
                  striped={true} hover={true}
                  selectRow={linksSelectRowProp}>
                <TableHeaderColumn width="350" dataSort={true} dataField="name" isKey={ true }>Name</TableHeaderColumn>
                <TableHeaderColumn width="180" dataSort={true} dataField="a_node_name">A-Node</TableHeaderColumn>
                <TableHeaderColumn width="180" dataSort={true} dataField="z_node_name">Z-Node</TableHeaderColumn>
                <TableHeaderColumn width="80" dataSort={true} dataField="alive">Alive</TableHeaderColumn>
                <TableHeaderColumn dataSort={true} dataField="type">Type</TableHeaderColumn>
              </BootstrapTable>
            </TabPanel>
            <TabPanel>

            </TabPanel>
          </Tabs>
        </SplitPane>
      </div>
    );
  }
}
