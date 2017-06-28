import React from 'react';
import { render } from 'react-dom';
// leaflet maps
import Leaflet from 'leaflet';
import { Map, Polyline, Popup, TileLayer, Marker, CircleMarker} from 'react-leaflet';
import Control from 'react-leaflet-control';

// dispatcher
import {Actions, SiteOverlayKeys, linkOverlayKeys} from './NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './NetworkStore.js';
// ui components
import NetworkDataTable from './NetworkDataTable.js';
import DetailsNode from './DetailsNode.js';
import DetailsLink from './DetailsLink.js';
import DetailsSite from './DetailsSite.js';
import DetailsTopology from './DetailsTopology.js';
import DetailsPlannedSite from './DetailsPlannedSite.js';
import SplitPane from 'react-split-pane';
const d3 = require('d3');

const SITE_MARKER = Leaflet.icon({
  iconUrl: '/static/images/site.png',
  iconSize: [50, 50],
  iconAnchor: [7, 8],
});

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
  nodesByName = {}
  linksByName = {}
  sitesByName = {}

  state = {
    selectedSite: null,
    selectedLink: null,
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
    plannedSite: null
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


  componentWillReceiveProps(nextProps) {
    if (this.props.networkConfig.topology.name != nextProps.networkConfig.topology.name) {
      this.resetZoomOnNextRefresh = true;
    }
    this.updateTopologyState(nextProps.networkConfig);
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
    // update helper maps
    this.updateTopologyState(this.props.networkConfig)
    // initial site selection
    if (NetworkStore.tabName == 'links' &&
        NetworkStore.selectedName &&
        NetworkStore.selectedName in this.linksByName) {
      this.setState({
        selectedLink: this.linksByName[NetworkStore.selectedName],
      });
    } else if (NetworkStore.tabName == 'nodes' &&
               NetworkStore.selectedName &&
               NetworkStore.selectedName in this.sitesByName) {
      this.setState({
        selectedSite: NetworkStore.selectedName,
      });
    }
  }

  componentWillUnmount() {
    // un-register if we're no longer visible
    window.removeEventListener('resize', this.resizeWindow);
    Dispatcher.unregister(this.dispatchToken);
  }

  handleDispatchEvent(payload) {
    switch (payload.actionType) {
      // TODO - compare props and update there...
      case Actions.TOPOLOGY_SELECTED:
        // update selected topology name and wipe the zoom level
        this.setState({
          routingOverlayEnabled: false,
          selectedSite: null,
          selectedLink: null,
          selectedNode: null,
        });
        break;
      case Actions.NODE_SELECTED:
        let site = this.nodesByName[ payload.nodeSelected].site_name;
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
      case Actions.PLANNED_SITE_CREAT:
        let plannedSite = {
          name: payload.siteName,
          lat: this.props.networkConfig ? this.props.networkConfig.latitude : 37.484494,
          long: this.props.networkConfig ? this.props.networkConfig.longitude : -122.1483976,
          alt: 0
        }
        this.setState({
          plannedSite: plannedSite
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
      // apply health data
      if (this.state.networkHealth &&
          this.state.networkHealth.links &&
          link.name in this.state.networkHealth.links) {
        let nodeHealth = this.state.networkHealth.links[link.name];
        link["alive_perc"] = nodeHealth.alive;
      }
    });
    // index sites by name
    let sitesByName = {};
    Object.keys(topologyJson.sites).map(siteIndex => {
      let site = topologyJson.sites[siteIndex];
      sitesByName[site.name] = site;
    });
    // reset the zoom when a new topology is selected
    let resetZoom = this.resetZoomOnNextRefresh;
    // update helper maps
    this.resetZoomOnNextRefresh = false;
    this.nodesByName = nodesByName;
    this.linksByName = linksByName;
    this.sitesByName = sitesByName;
    // update zoom level
    this.setState({
      zoomLevel: resetZoom ? networkConfig.zoom_level :
                             this.state.zoomLevel,
    });
  }

  componentDidMount() {
    this.refs.map.leafletElement.invalidateSize();
  }

  _onMapZoom(data) {
    this.setState({
      zoomLevel: data.target._zoom,
    });
  }

  _paneChange(newSize) {
    this.refs.map.leafletElement.invalidateSize();
    this.setState({
      lowerPaneHeight: window.innerHeight - newSize,
    });
  }

  handleMarkerClick(ev) {
    let site = this.props.networkConfig.topology.sites[
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

  updatePlannedPosition() {
    const { lat, lng } = this.refs.palnnedSiteMarker.leafletElement.getLatLng();
    let plannedSite = this.state.plannedSite;
    plannedSite.lat = lat;
    plannedSite.long = lng;
    this.setState({
      plannedSite: plannedSite,
    });
  }

  updatePlannedSite(plannedSite) {
    this.setState({
      plannedSite: plannedSite,
    });
  }

  removePlannedSite() {
    this.setState({
      plannedSite: null,
    });
  }

  updatePosition = () => {
      const { lat, lng } = this.refs.marker.leafletElement.getLatLng();
      this.setState({
        marker: { lat, lng },
      });
    };

  render() {
    // use the center position from the topology if set
    const centerPosition = this.props.networkConfig ?
      [this.props.networkConfig.latitude,
       this.props.networkConfig.longitude] :
      [37.484494, -122.1483976];
    let siteComponents = [];
    let linkComponents = [];
    let siteMarkers = [];

    let topology = this.props.networkConfig.topology;
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
      let hasPop = false;
      Object.keys(topology.nodes).map(nodeIndex => {
        let node = topology.nodes[nodeIndex];
        if (node.site_name == site.name) {
          totalCount++;
          healthyCount += (node.status == 2 || node.status == 3) ? 1 : 0;
          polarityCount += node.polarity ? node.polarity : 0;
          hasPop = node.pop_node ? true : hasPop;
        }
      });
      let polarity = polarityCount / totalCount;

      let contextualMarker = null;
      switch (this.props.siteOverlay) {
        case 'Health':
          if (totalCount == 0) {
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Health.Empty.color, siteIndex);
          } else if (totalCount == healthyCount) {
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Health.Healthy.color, siteIndex);
          } else if (healthyCount == 0) {
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Health.Unhealthy.color, siteIndex);
          } else {
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Health.Partial.color, siteIndex);
          }
          break;
        case 'Polarity':
          if (polarity == 1) {
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Polarity.Odd.color, siteIndex);
          } else if (polarity == 2) {
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Polarity.Even.color, siteIndex);
          } else if (polarity > 0) {
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Polarity.Hybrid.color, siteIndex);
          } else {
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Polarity.Unknown.color, siteIndex);
          }
          break;
        default:
          contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Health.Unhealthy.color);
      }
      siteComponents.push(contextualMarker);
      if (hasPop) {
        let secondaryMarker = 
          <CircleMarker center={siteCoords}
            radius={5}
            clickable
            fillOpacity={1}
            color="blue"
            key={"pop-node" + siteIndex}
            siteIndex={siteIndex}
            onClick={this.handleMarkerClick}
            fillColor="blue"
            level={11}/>;
        siteComponents.push(secondaryMarker);
      }
    });

    Object.keys(topology.links).map(linkName => {
      let link = topology.links[linkName];
      if (link.link_type != 1) {
        return;
      }
      let aNodeSite = this.sitesByName[
        this.nodesByName[link.a_node_name].site_name];
      let zNodeSite = this.sitesByName[
        this.nodesByName[link.z_node_name].site_name];

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
              linkLine = this.getLinkLine(link, linkCoords, linkOverlayKeys.Health.Healthy.color);
            } else {
              linkLine = this.getLinkLine(link, linkCoords, linkOverlayKeys.Health.Unhealthy.color);
            }
            break;
          case 'Uptime':
            if (link.hasOwnProperty("alive_perc")) {
              var bwUsageColor = d3.scaleLinear()
                  .domain([0, 50, 100])
                  .range(["red", "white", "green"]);
              var linkColor = d3.rgb(bwUsageColor(link.alive_perc));
              linkLine = this.getLinkLine(link, linkCoords, linkColor);
            } else {
              linkLine = this.getLinkLine(link, linkCoords, linkOverlayKeys.Uptime.Unknown.color);
            }
            break;
          default:
            linkLine = this.getLinkLine(link, linkCoords, linkOverlayKeys.Health.Unknown.color);
        }
      }
      if (linkLine) {
        linkComponents.push(linkLine);
      }
    });

    if (this.state.routingOverlayEnabled && this.state.routeSourceNode) {
      let sourceSite = this.sitesByName[this.state.routeSourceNode.site_name];
      let destSite = this.sitesByName[this.state.routeDestNode.site_name];
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
      let site = this.sitesByName[this.state.selectedSite];
      if (site && site.location) {
        siteMarkers =
          <CircleMarker center={[site.location.latitude, site.location.longitude]}
                  radius={18}
                  color="rgb(30,116,255)"/>;
      }
    } else if (this.state.selectedLink != null) {
      let node_a = this.nodesByName[this.state.selectedLink.a_node_name];
      let node_z = this.nodesByName[this.state.selectedLink.z_node_name];
      if (node_a && node_z) {
        let site_a = this.sitesByName[node_a.site_name];
        let site_z = this.sitesByName[node_z.site_name];
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
    let showOverview = false;
    if (this.state.detailsExpanded) {
      if (this.state.selectedLink) {
        layersControl =
          <Control position="topright">
            <DetailsLink topologyName={this.props.networkConfig.topology.name}
                         link={this.state.selectedLink}
                         nodes={this.nodesByName}
                         onClose={() => this.setState({detailsExpanded: false})}
            />
          </Control>
      } else if (this.state.selectedNode) {
        let node  = this.nodesByName[this.state.selectedNode];
        layersControl =
          <Control position="topright">
            <DetailsNode topologyName={this.props.networkConfig.topology.name}
                         node={node}
                         links={this.linksByName}
                         onClose={() => this.setState({detailsExpanded: false})}
            />
          </Control>
      } else if (this.state.selectedSite) {
        let site = this.sitesByName[this.state.selectedSite];
        layersControl =
          <Control position="topright">
            <DetailsSite topologyName={this.props.networkConfig.topology.name}
                         site={site}
                         nodes={this.nodesByName}
                         links={this.linksByName}
                         onClose={() => this.setState({detailsExpanded: false})}
            />
          </Control>
      } else {
        showOverview = true;
      }
    } else {
      showOverview = true;
    }
    if (showOverview) {
      // overview
      layersControl =
        <Control position="topright">
          <DetailsTopology topologyName={this.props.networkConfig.topology.name}
                           nodes={this.nodesByName}
                           links={this.linksByName}
                           onClose={() => this.setState({detailsExpanded: false})}
          />
        </Control>;
    }

    let tablesControl =
      <Control position="bottomright" >
        <img style={{backgroundColor: "rgba(245, 245, 245, 0.8)"}} src={this.state.tablesExpanded? "/static/images/table.png" : "/static/images/table-accent.png"} onClick={this.handleExpandTablesClick}/>
      </Control>


    let tileUrl = CONFIG.use_tile_proxy ?
        '/tile/{s}/{z}/{x}/{y}.png' :
        'http://{s}.tile.osm.org/{z}/{x}/{y}.png';

    let plannedSite = <div/>;
    if (this.state.plannedSite) {
        plannedSite =
          <Marker
            icon={SITE_MARKER}
            draggable={true}
            onDragend={this.updatePlannedPosition.bind(this)}
            position={[this.state.plannedSite.lat, this.state.plannedSite.long]}
            ref="palnnedSiteMarker"
            radius={20}>
          </Marker>
        layersControl =
          <Control position="topright">
            <DetailsPlannedSite
              site={this.state.plannedSite}
              topologyName={this.props.networkConfig.topology.name}
              onUpdate={this.updatePlannedSite.bind(this)}
              onClose={this.removePlannedSite.bind(this)}/>
          </Control>
    }

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
            {plannedSite}
          </CustomMap>
          <NetworkDataTable height={this.state.lowerPaneHeight}
                            networkConfig={this.props.networkConfig} />
        </SplitPane>
      </div>
    );
  }
}
NetworkMap.propTypes = {
  networkConfig: React.PropTypes.object.isRequired,
};
