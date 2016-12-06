import React from 'react';
import { render } from 'react-dom';
// leaflet maps
import Leaflet from 'leaflet';
import { Map, Marker, Polyline, Popup, TileLayer, Circle} from 'react-leaflet';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
// ui components
import NetworkDataTable from './NetworkDataTable.js';
import SplitPane from 'react-split-pane';

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
    selectedNodeSite: null,
    selectedLink: null,
    topologyName: null,
    topologyJson: {},
    zoomLevel: 18,
    // sorting
    sortName: undefined,
    sortOrder: undefined,
    selectedSiteName: undefined,
  }

  constructor(props) {
    super(props);
  }

  componentWillMount() {
    // register once we're visible
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    // update default state from the store
    if (NetworkStore.topologyName && NetworkStore.topologyJson) {
      this.setState(this.updateTopologyState(NetworkStore.topologyJson));
    }
  }

  componentWillUnmount() {
    // un-register if we're no longer visible
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      // TODO - do we need to know the name?
      case Actions.TOPOLOGY_SELECTED:
        // update selected topology name
        this.setState({
          topologyName: payload.topologyName,
        });
        break;
      case Actions.TOPOLOGY_REFRESHED:
        // update the topology
        this.setState(this.updateTopologyState(payload.topologyJson))
        break;
      case Actions.NODE_SELECTED:
        let lastSelectedNodeSite = payload.nodesSelected.length ?
          this.state.nodesByName[
            payload.nodesSelected[payload.nodesSelected.length - 1]].site_name :
          null;
        this.setState({
          selectedNodeSite: lastSelectedNodeSite,
        });
        break;
      case Actions.LINK_SELECTED:
        this.setState({
          selectedLink: payload.link,
        });
        break;
      case Actions.SITE_SELECTED:
        this.setState({
          selectedNodeSite: payload.siteSelected,
        });
        break;
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          selectedNodeSite: null,
          selectedLink: null,
        });
        break;
    }
  }

  updateTopologyState(topologyJson) {
    let nodesByName = {};
    Object.keys(topologyJson.nodes).map(nodeIndex => {
      let node = topologyJson.nodes[nodeIndex];
      nodesByName[node.name] = node;
    });
    // index sites by name
    let sitesByName = {};
    Object.keys(topologyJson.sites).map(siteIndex => {
      let site = topologyJson.sites[siteIndex];
      sitesByName[site.name] = site;
    });
    return {
      topologyJson: topologyJson,
      nodesByName: nodesByName,
      sitesByName: sitesByName,
    }
  }

  componentDidMount() {
    this.refs.map.leafletElement.invalidateSize();
  }

  _onMapZoom(data){
    this.setState({
      zoomLevel: data.target._zoom,
    });
  }

  _paneChange(newSize) {
    this.refs.map.leafletElement.invalidateSize();
    // dispatch to update all UIs
    Dispatcher.dispatch({
      actionType: Actions.PANE_CHANGED,
      newSize: newSize,
    });
  }

  _handleMarkerClick(ev) {
    let site = this.state.topologyJson.sites[ev.target.options.siteIndex];
    // dispatch to update all UIs
    Dispatcher.dispatch({
      actionType: Actions.SITE_SELECTED,
      siteSelected: site.name,
    });
  }

 _siteSortFunc(a, b, order) {   // order is desc or asc
    if (this.state.selectedSiteName) {
      if (a.site_name == this.state.selectedSiteName) {
        return -1;
      } else if (b.site_name == this.state.selectedSiteName) {
        return 1;
      }
    }

    if (order === 'desc') {
      if (a.site_name > b.site_name) {
        return -1;
      } else if (a.site_name < b.site_name) {
        return 1;
      }
      return 0;
    } else {
      if (a.site_name < b.site_name) {
        return -1;
      } else if (a.site_name > b.site_name) {
        return 1;
      }
      return 0;
    }
  }

  onSortChange(sortName, sortOrder) {
    console.info('onSortChange', arguments);
    this.setState({
      sortName,
      sortOrder,
      selectedSiteName: undefined
    });
  }

  render() {
    const centerPosition = [37.484494, -122.1483976];
    let siteComponents = [];
    let linkComponents = [];
    if (this.state.topologyJson && this.state.topologyJson.sites) {
      Object.keys(this.state.topologyJson.sites).map(siteIndex => {
        let site = this.state.topologyJson.sites[siteIndex];
        if (!site.location) {
          site.location = {};
          site.location.latitude = 0;
          site.location.longitude = 0;
        }
        let siteCoords = [site.location.latitude, site.location.longitude];

        let healthyCount = 0;
        let totalCount = 0;
        Object.keys(this.state.topologyJson.nodes).map(nodeIndex => {
          let node = this.state.topologyJson.nodes[nodeIndex];
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
            siteIndex={siteIndex}
            onclick={this._handleMarkerClick.bind(this)}
            position={siteCoords}>
          </Marker>
        );
      });
      Object.keys(this.state.topologyJson.links).map(linkName => {
        let link = this.state.topologyJson.links[linkName];
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
    if (this.state.selectedNodeSite != null) {
      let site = this.state.sitesByName[this.state.selectedNodeSite];
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
                    key="a_node"
                    color='red'/>];
          if (site_a.name != site_z.name) {
            siteMarkers.push(
              <Circle center={[site_z.location.latitude, site_z.location.longitude]}
                      radius={4 * Math.pow(2, 19 - this.state.zoomLevel)}
                      key="z_node"
                      color='red'/>);
          }
        }
      }
    }

    return (
      <div>
        <SplitPane
          split="horizontal"
          defaultSize="50%"
          onChange={this._paneChange.bind(this)}
        >
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
          <NetworkDataTable />
        </SplitPane>
      </div>
    );
  }
}
