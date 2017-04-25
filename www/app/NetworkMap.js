import React from 'react';
import { render } from 'react-dom';
// leaflet maps
import Leaflet from 'leaflet';
import { Map, Polyline, Popup, TileLayer, CircleMarker} from 'react-leaflet';
import Control from 'react-leaflet-control';

// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
// ui components
import NetworkDataTable from './NetworkDataTable.js';
import DetailsNode from './DetailsNode.js';
import DetailsLink from './DetailsLink.js';
import DetailsSite from './DetailsSite.js';
import SplitPane from 'react-split-pane';
const d3 = require('d3');

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

export default class NetworkMap extends React.Component {
  state = {
    selectedSite: null,
    selectedLink: null,
    networkName: null,
    networkConfig: undefined,
    routeWeights: {},
    routeSourceNode: null,
    routeDestNode: null,
    // reset zoom level to a topologies default
    zoomLevel: 18,
    // sorting
    sortName: undefined,
    sortOrder: undefined,
    routingOverlayEnabled: false,
    detailsExpanded: true,
    tablesExpanded: true,
    networkHealth: {},
    lowerPaneHeight: window.innerHeight / 2,
  }

  constructor(props) {
    super(props);
    this.getSiteMarker = this.getSiteMarker.bind(this);
    this.handleMarkerClick = this.handleMarkerClick.bind(this);
    this.handleExpandTablesClick = this.handleExpandTablesClick.bind(this);
    this.resizeWindow = this.resizeWindow.bind(this);
    // reset zoom on next refresh is set once a new topology is selected
    this.resetZoomOnNextRefresh = true;

  }

  resizeWindow(event) {
    this.refs.map.leafletElement.invalidateSize();
    this.setState({
      lowerPaneHeight: window.innerHeight - this.refs.split_pane.splitPane.childNodes[0].clientHeight,
    });
  }

  componentWillMount() {
    // register once we're visible
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    window.addEventListener('resize', this.resizeWindow);
    this.setState({
      networkHealth: NetworkStore.networkHealth,
    });
    // update default state from the store
    if (NetworkStore.networkName && NetworkStore.networkConfig) {
      this.setState(
        this.updateTopologyState(NetworkStore.networkConfig)
      );
    }
  }

  componentWillUnmount() {
    // un-register if we're no longer visible
    window.removeEventListener('resize', this.resizeWindow);
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
          routingOverlayEnabled: false,
          selectedSite: null,
          selectedLink: null,
          selectedNode: null,
        });
        break;
      case Actions.TOPOLOGY_REFRESHED:
        // update the topology
        this.setState(this.updateTopologyState(payload.networkConfig))
        break;
      case Actions.NODE_SELECTED:
        let site = this.state.nodesByName[ payload.nodeSelected].site_name;
        this.setState({
          selectedSite: site,
          selectedNode: payload.nodeSelected,
          selectedLink: null,
        });
        break;
      case Actions.LINK_SELECTED:
        this.setState({
          selectedLink: payload.link,
          selectedSite: null,
          selectedNode: null,
        });
        break;
      case Actions.SITE_SELECTED:
        this.setState({
          selectedSite: payload.siteSelected,
          selectedLink: null,
          selectedNode: null,
        });
        break;
      case Actions.DISPLAY_ROUTE:
        this.setState({
          routeWeights: payload.routeWeights,
          routeSourceNode: payload.routeSourceNode,
          routeDestNode: payload.routeDestNode,
          routingOverlayEnabled: true,
          selectedSite: null,
          selectedLink: null,
          selectedNode: null,
        });
        break;
      case Actions.CLEAR_ROUTE:
        this.setState({
          routeWeights: null,
          routeSourceNode: null,
          routeDestNode: null,
          routingOverlayEnabled: false,
        });
        break;
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          selectedSite: null,
          selectedLink: null,
          selectedNode: null,
        });
        break;
      case Actions.HEALTH_REFRESHED:
        this.setState({
          networkHealth: payload.health,
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
    let linksByName = {};
    Object.keys(topologyJson.links).map(linkIndex => {
      let link = topologyJson.links[linkIndex];
      linksByName[link.name] = link;
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
      linksByName: linksByName,
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
  }

  _paneChange(newSize) {
    this.refs.map.leafletElement.invalidateSize();
    this.setState({
      lowerPaneHeight: window.innerHeight - newSize,
    });
  }

  handleMarkerClick(ev) {
    let site = this.state.networkConfig.topology.sites[
      ev.target.options.siteIndex];
    // dispatch to update all UIs
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'nodes',
    });
    Dispatcher.dispatch({
      actionType: Actions.SITE_SELECTED,
      siteSelected: site.name,
    });
  }

  handleExpandTablesClick(ev) {
    setTimeout(function() {
      this.refs.map.leafletElement.invalidateSize();
    }.bind(this), 1);
    this.setState({
      tablesExpanded: this.state.tablesExpanded ? false : true,
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

  getLinkLine(link, coords, color): ReactElement<any> {
    return (
      <Polyline
        key={link.name}
        positions={coords}
        weight={6}
        onClick={e => {
          Dispatcher.dispatch({
            actionType: Actions.TAB_SELECTED,
            tabName: "links",
          });
          Dispatcher.dispatch({
            actionType: Actions.LINK_SELECTED,
            link: link,
            source: "map",
          })
        }}
        color={color}
        level={5}>
      </Polyline>);
  }

  render() {
    // use the center position from the topology if set
    const centerPosition = this.state.networkConfig ?
      [this.state.networkConfig.latitude,
       this.state.networkConfig.longitude] :
      [37.484494, -122.1483976];
    let siteComponents = [];
    let linkComponents = [];
    let siteMarkers = [];

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
        switch (this.props.siteOverlay) {
          case 'Health':
						if (totalCount == 0) {
              contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Health.Empty.color, siteIndex);
						} else if (totalCount == healthyCount) {
              contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Health.Healthy.color, siteIndex);
            } else if (healthyCount == 0) {
              contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Health.Unhealthy.color, siteIndex);
            } else {
              contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Health.Partial.color, siteIndex);
            }
            break;
          case 'Polarity':
            if (polarity == 1) {
              contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Polarity.Odd.color, siteIndex);
            } else if (polarity == 2) {
              contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Polarity.Even.color, siteIndex);
            } else if (polarity > 0) {
              contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Polarity.Hybrid.color, siteIndex);
            } else {
              contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Polarity.Unknown.color, siteIndex);
            }
            break;
          default:
            contextualMarker = this.getSiteMarker(siteCoords, this.props.siteOverlayKeys.Health.Unhealthy.color);
        }
        siteComponents.push(contextualMarker);
      });

      let linksData = {};
      if (topology &&
          topology.links) {
        Object(topology.links).forEach(link => {
          if (this.state.networkHealth &&
              this.state.networkHealth.links &&
              link.a_node_name in this.state.networkHealth.links &&
              link.z_node_name in this.state.networkHealth.links[link.a_node_name]) {
            let nodeHealth = this.state.networkHealth.links[link.a_node_name]
                                                           [link.z_node_name];
            linksData[link.name] = {
              alive_perc: nodeHealth.alive,
              snr_health_perc: nodeHealth.snr,
            };
          }
        });
      }

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
        if(this.state.routingOverlayEnabled) {
          if (this.state.routeWeights && this.state.routeWeights[link.name]) {
            var bwUsageColor = d3.scaleLinear()
                .domain([0, 100])
                .range(['white', '#4169e1']);
            var linkColor = d3.rgb(bwUsageColor(this.state.routeWeights[link.name]));
            linkLine = this.getLinkLine(link, linkCoords, linkColor);
          }
        } else {
          switch (this.props.linkOverlay) {
            case 'Health':
              if (link.is_alive) {
                linkLine = this.getLinkLine(link, linkCoords, this.props.linkOverlayKeys.Health.Healthy.color);
              } else {
                linkLine = this.getLinkLine(link, linkCoords, this.props.linkOverlayKeys.Health.Unhealthy.color);
              }
              break;
            case 'Uptime':
              if (linksData[link.name]) {
                var bwUsageColor = d3.scaleLinear()
                    .domain([0, 50, 100])
                    .range(["red", "white", "green"]);
                var linkColor = d3.rgb(bwUsageColor(linksData[link.name].alive_perc));
                linkLine = this.getLinkLine(link, linkCoords, linkColor);
              } else {
                linkLine = this.getLinkLine(link, linkCoords, this.props.linkOverlayKeys.Uptime.Unknown.color);
              }
              break;
            case 'Snr_Perc':
              if (linksData[link.name]) {
                var bwUsageColor = d3.scaleLinear()
                    .domain([0, 50, 100])
                    .range(["red", "white", "green"]);
                var linkColor = d3.rgb(bwUsageColor(linksData[link.name].snr_health_perc));
                linkLine = this.getLinkLine(link, linkCoords, linkColor);
              } else {
                linkLine = this.getLinkLine(link, linkCoords, this.props.linkOverlayKeys.Snr_Perc.Unknown.color);
              }
              break;
            default:
              linkLine = this.getLinkLine(link, linkCoords, this.props.linkOverlayKeys.Health.Unknown.color);
          }
        }
        if (linkLine) {
          linkComponents.push(linkLine);
        }
      });
    }

    if (this.state.routingOverlayEnabled && this.state.routeSourceNode) {
      let sourceSite = this.state.sitesByName[this.state.routeSourceNode.site_name];
      let destSite = this.state.sitesByName[this.state.routeDestNode.site_name];
      siteMarkers.push(
          <CircleMarker center={[sourceSite.location.latitude, sourceSite.location.longitude]}
                  radius={18}
                  key="source_node"
                  color="blue"/>);
      siteMarkers.push(
          <CircleMarker center={[destSite.location.latitude, destSite.location.longitude]}
                  radius={18}
                  key="dest_node"
                  color="magenta"/>);
    }

    if (this.state.selectedSite != null) {
      let site = this.state.sitesByName[this.state.selectedSite];
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

    let layersControl =
      <Control position="topright">
        <img src="/static/images/layers.png" onClick={() => this.setState({detailsExpanded: true})}/>
      </Control>;
    if (this.state.detailsExpanded) {
      if (this.state.selectedLink) {
        layersControl =
          <Control position="topright">
            <DetailsLink topologyName={this.state.networkConfig.topology.name} link={this.state.selectedLink} nodes={this.state.nodesByName} onClose={() => this.setState({detailsExpanded: false})}/>
          </Control>
      } else if (this.state.selectedNode) {
        let node  = this.state.nodesByName[this.state.selectedNode];
        layersControl =
          <Control position="topright">
            <DetailsNode node={node} links={this.state.linksByName} onClose={() => this.setState({detailsExpanded: false})}/>
          </Control>
      } else if (this.state.selectedSite) {
        let site = this.state.sitesByName[this.state.selectedSite];
        layersControl =
          <Control position="topright">
            <DetailsSite site={site} nodes={this.state.nodesByName} links={this.state.linksByName} onClose={() => this.setState({detailsExpanded: false})}/>
          </Control>
      }
    }

    let tablesControl =
      <Control position="bottomright" >
        <img style={{backgroundColor: "rgba(245, 245, 245, 0.8)"}} src={this.state.tablesExpanded? "/static/images/table.png" : "/static/images/table-accent.png"} onClick={this.handleExpandTablesClick}/>
      </Control>


    let tileUrl = CONFIG.use_tile_proxy ?
        '/tile/{s}/{z}/{x}/{y}.png' :
        'http://{s}.tile.osm.org/{z}/{x}/{y}.png';

    return (
      <div>
        <SplitPane
          split="horizontal"
          ref='split_pane'
          defaultSize= "50%"
          className= {this.state.tablesExpanded ? "SplitPane" : "soloPane1"}
          onChange={this._paneChange.bind(this)}
        >
          <CustomMap
            ref='map'
            onZoom={this._onMapZoom.bind(this)}
            onClick={this._onMapClick.bind(this)}
            center={centerPosition} zoom={this.state.zoomLevel}>
            <TileLayer
              url={tileUrl}
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            {linkComponents}
            {siteComponents}
            {siteMarkers}
            {layersControl}
            {tablesControl}
          </CustomMap>
          <NetworkDataTable height={this.state.lowerPaneHeight}/>
        </SplitPane>
      </div>
    );
  }
}
