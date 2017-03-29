import React from 'react';
import { render } from 'react-dom';
// leaflet maps
import Leaflet from 'leaflet';
import { Map, Polyline, TileLayer, CircleMarker} from 'react-leaflet';
import Control from 'react-leaflet-control';

// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
// ui components
import NetworkDataTable from './NetworkDataTable.js';
import SplitPane from 'react-split-pane';

export class CustomMap extends Map {
  createLeafletElement (props: Object): Object {
    return Leaflet.map(this.container, props);
  }
  componentDidUpdate (prevProps: Object) {
    this.updateLeafletElement(prevProps, this.props);
    const layers = this.leafletElement._layers;
    Object.values(layers)
      .filter((layer) => {
        return typeof layer.options.level !== "undefined";
      })
      .sort((layerA, layerB) => {
        return layerA.options.level - layerB.options.level;
      })
      .forEach((layer) => {
        layer.bringToFront();
      });
  }
}

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
}

export default class NetworkMap extends React.Component {
  state = {
    selectedNodeSite: null,
    selectedLink: null,
    networkName: null,
    networkConfig: undefined,
    // reset zoom level to a topologies default
    zoomLevel: 18,
    // sorting
    sortName: undefined,
    sortOrder: undefined,
    selectedSiteName: undefined,
    selectedSiteOverlay: 'Health',
    selectedLinkOverlay: 'Health',
    layersExpanded: false,
  }

  constructor(props) {
    super(props);
    this.getSiteMarker = this.getSiteMarker.bind(this);
    this.handleMarkerClick = this.handleMarkerClick.bind(this);
    this.handleLayersClick = this.handleLayersClick.bind(this);
    // reset zoom on next refresh is set once a new topology is selected
    this.resetZoomOnNextRefresh = true;
  }

  componentWillMount() {
    // register once we're visible
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    // update default state from the store
    if (NetworkStore.networkName && NetworkStore.networkConfig) {
      this.setState(
        this.updateTopologyState(NetworkStore.networkConfig)
      );
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
        // update selected topology name and wipe the zoom level
        // we'll
        this.resetZoomOnNextRefresh = true;
        this.setState({
          networkName: payload.networkName,
        });
        break;
      case Actions.TOPOLOGY_REFRESHED:
        // update the topology
        this.setState(this.updateTopologyState(payload.networkConfig))
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

  updateTopologyState(networkConfig) {
    let topologyJson = networkConfig.topology;
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
    // reset the zoom when a new topology is selected
    let resetZoom = this.resetZoomOnNextRefresh;
    this.resetZoomOnNextRefresh = false;
    return {
      nodesByName: nodesByName,
      sitesByName: sitesByName,
      networkConfig: networkConfig,
      zoomLevel: resetZoom ? networkConfig.zoom_level :
                             this.state.zoomLevel,
    };
  }

  componentDidMount() {
    this.refs.map.leafletElement.invalidateSize();
  }

  _onMapZoom(data) {
    this.setState({
      zoomLevel: data.target._zoom,
    });
  }

  _onMapClick(data) {
    this.setState({
      layersExpanded: false,
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

  handleMarkerClick(ev) {
    let site = this.state.networkConfig.topology.sites[
      ev.target.options.siteIndex];
    // dispatch to update all UIs
    Dispatcher.dispatch({
      actionType: Actions.SITE_SELECTED,
      siteSelected: site.name,
    });
  }

  handleLayersClick(ev) {
    this.setState({
      layersExpanded: true,
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
    this.setState({
      sortName,
      sortOrder,
      selectedSiteName: undefined
    });
  }

  getSiteMarker(pos, color, siteIndex): ReactElement<any> {
    return (
      <CircleMarker center={pos}
        radius={10}
        clickable
        fillOpacity={1}
        color = {color}
        key={siteIndex}
        siteIndex={siteIndex}
        onClick={this.handleMarkerClick}
        fillColor={color}
        level={10}/>);
  }

  getLinkLine(name, coords, color): ReactElement<any> {
    return (
      <Polyline
        key={name}
        positions={coords}
        color={color}
        level={5}
        />);
  }

  render() {
    // use the center position from the topology if set
    const centerPosition = this.state.networkConfig ?
      [this.state.networkConfig.latitude,
       this.state.networkConfig.longitude] :
      [37.484494, -122.1483976];
    let siteComponents = [];
    let linkComponents = [];
    if (this.state.networkConfig &&
        this.state.networkConfig.topology &&
        this.state.networkConfig.topology.sites) {
      let topology = this.state.networkConfig.topology;
      Object.keys(topology.sites).map(siteIndex => {
        let site = topology.sites[siteIndex];
        if (!site.location) {
          site.location = {};
          site.location.latitude = 0;
          site.location.longitude = 0;
        }
        let siteCoords = [site.location.latitude, site.location.longitude];

        let healthyCount = 0;
        let polarityCount = 0;
        let totalCount = 0;
        Object.keys(topology.nodes).map(nodeIndex => {
          let node = topology.nodes[nodeIndex];
          if (node.site_name == site.name) {
            totalCount++;
            healthyCount += (node.status == 2 || node.status == 3) ? 1 : 0;
            polarityCount += node.polarity ? node.polarity : 0;
          }
        });

        let polarity = polarityCount / totalCount;

        let contextualMarker = null;
        switch (this.state.selectedSiteOverlay) {
          case 'Health':
						if (totalCount == 0) {
              contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Health.Empty.color, siteIndex);
						} else if (totalCount == healthyCount) {
              contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Health.Healthy.color, siteIndex);
            } else if (healthyCount == 0) {
              contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Health.Unhealthy.color, siteIndex);
            } else {
              contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Health.Partial.color, siteIndex);
            }
            break;
          case 'Polarity':
            if (polarity == 1) {
              contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Polarity.Odd.color, siteIndex);
            } else if (polarity == 2) {
              contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Polarity.Even.color, siteIndex);
            } else if (polarity > 0) {
              contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Polarity.Hybrid.color, siteIndex);
            } else {
              contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Polarity.Unknown.color, siteIndex);
            }
            break;
          default:
            contextualMarker = this.getSiteMarker(siteCoords, siteOverlayKeys.Health.Unhealthy.color);
        }
        siteComponents.push(contextualMarker);
      });
      Object.keys(topology.links).map(linkName => {
        let link = topology.links[linkName];
        if (link.link_type != 1) {
          return;
        }
        let aNodeSite = this.state.sitesByName[
          this.state.nodesByName[link.a_node_name].site_name];
        let zNodeSite = this.state.sitesByName[
          this.state.nodesByName[link.z_node_name].site_name];

        if (!aNodeSite || !zNodeSite ||
            !aNodeSite.location || !zNodeSite.location) {
          console.error('Site mis-match for link', link.name);
          return;
        }

        const linkCoords = [
          [aNodeSite.location.latitude, aNodeSite.location.longitude],
          [zNodeSite.location.latitude, zNodeSite.location.longitude],
        ];

        let linkLine = null;
        switch (this.state.selectedLinkOverlay) {
          case 'Health':
            if (link.is_alive) {
              linkLine = this.getLinkLine(link.name, linkCoords, linkOverlayKeys.Health.Healthy.color);
            } else {
              linkLine = this.getLinkLine(link.name, linkCoords, linkOverlayKeys.Health.Unhealthy.color);
            }
            break;
          default:
            linkLine = this.getLinkLine(link.name, linkCoords, linkOverlayKeys.Health.Unknown.color);
        }
        linkComponents.push(linkLine);
      });
    }

    let siteMarkers = [];
    if (this.state.selectedNodeSite != null) {
      let site = this.state.sitesByName[this.state.selectedNodeSite];
      if (site && site.location) {
        siteMarkers =
          <CircleMarker center={[site.location.latitude, site.location.longitude]}
                  radius={18}
                  color="rgb(30,116,255)"/>;
      }
    } else if (this.state.selectedLink != null) {
      let node_a = this.state.nodesByName[this.state.selectedLink.a_node_name];
      let node_z = this.state.nodesByName[this.state.selectedLink.z_node_name];
      if (node_a && node_z) {
        let site_a = this.state.sitesByName[node_a.site_name];
        let site_z = this.state.sitesByName[node_z.site_name];
        if (site_a && site_z && site_a.location && site_z.location) {
          siteMarkers = [
            <CircleMarker center={[site_a.location.latitude,
                             site_a.location.longitude]}
                    radius={18}
                    key="a_node"
                    color="rgb(30,116,255)"/>];
          if (site_a.name != site_z.name) {
            siteMarkers.push(
              <CircleMarker center={[site_z.location.latitude,
                               site_z.location.longitude]}
                      radius={18}
                      key="z_node"
                      color="rgb(30,116,255)"/>);
          }
        }
      }
    }

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

    let layersControl = {};
    if (this.state.layersExpanded) {
      layersControl =
        <Control position="topright" >
          <div className="groupingContainer">
            <p>Map Overlays</p>
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
          </div>
        </Control>
    } else {
      layersControl =
        <Control position="topright" >
          <img src="/static/images/layers.png" onClick={this.handleLayersClick}/>
        </Control>
    }


    return (
      <div>
        <SplitPane
          split="horizontal"
          defaultSize="50%"
          onChange={this._paneChange.bind(this)}
        >
          <CustomMap
            ref='map'
            onZoom={this._onMapZoom.bind(this)}
            onClick={this._onMapClick.bind(this)}
            center={centerPosition} zoom={this.state.zoomLevel}>
            <TileLayer
              url='/tile/{s}/{z}/{x}/{y}.png'
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            {linkComponents}
            {siteComponents}
            {siteMarkers}
            {layersControl}
          </CustomMap>
          <NetworkDataTable />
        </SplitPane>
      </div>
    );
  }
}
