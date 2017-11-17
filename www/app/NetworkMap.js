import React from 'react';
import { render } from 'react-dom';
// leaflet maps
import Leaflet, { Point, LatLng } from 'leaflet';
import { Map, Polyline, Popup, TileLayer, Marker, CircleMarker } from 'react-leaflet';
import Control from 'react-leaflet-control';
import LeafletGeom from 'leaflet-geometryutil';

// dispatcher
import {Actions, SiteOverlayKeys, linkOverlayKeys} from './constants/NetworkConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import NetworkStore from './stores/NetworkStore.js';
// ui components
import NetworkDataTable from './NetworkDataTable.js';

import DetailsNode from './components/detailpanels/DetailsNode.js';
import DetailsLink from './components/detailpanels/DetailsLink.js';
import DetailsSite from './components/detailpanels/DetailsSite.js';
import DetailsTopology from './components/detailpanels/DetailsTopology.js';
import DetailsPlannedSite from './components/detailpanels/DetailsPlannedSite.js';
import DetailsTopologyIssues from './components/detailpanels/DetailsTopologyIssues.js';

import SplitPane from 'react-split-pane';
import { polarityColor } from './NetworkHelper.js';
const d3 = require('d3');
import { Index, TimeSeries, TimeRange, TimeRangeEvent } from "pondjs";

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
    linkHealth: {},

    // UI
    upperPaneHeight: window.innerHeight / 2, // available height of the upper pane
    lowerPaneHeight: window.innerHeight / 2, // available height of the lower pane

    plannedSite: null,
    linkOverlayData: null,
    showTopologyIssuesPane: false,
    newTopology: {},
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
      // TODO: hacky, we need the Math.min here because the resize can happen in 2 ways:
      // both panes resize at the same time, and the upper one shrinks when it has the height of the whole window
      upperPaneHeight: Math.min(window.innerHeight, this.refs.split_pane.splitPane.childNodes[0].clientHeight),
      lowerPaneHeight: this.state.tablesExpanded ? window.innerHeight - this.refs.split_pane.splitPane.childNodes[0].clientHeight : this.state.lowerPaneHeight,
    });
  }

  componentWillMount() {
    // register once we're visible
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this));
    window.addEventListener('resize', this.resizeWindow);
    this.setState({
      linkHealth: NetworkStore.linkHealth,
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

  // TODO Kelvin: put some state into a store and update the store via actions
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
        let site = this.nodesByName[payload.nodeSelected].site_name;
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
          linkHealth: payload.linkHealth,
        });
        break;
      case Actions.LINK_OVERLAY_REFRESHED:
        if (payload.overlay) {
          let series = new TimeSeries(payload.overlay);
          this.setState({
            linkOverlayData: series,
          });
        } else {
          this.setState({
            linkOverlayData: null,
          });
        }
        break;
      case Actions.TOPOLOGY_ISSUES_PANE:
        this.setState({
          showTopologyIssuesPane: payload.visible,
          newTopology: payload.topology,
        });
        break;
    }
  }

  updateTopologyState(networkConfig) {
    let topologyJson = networkConfig.topology;
    // index sites by name
    let sitesByName = {};
    Object.keys(topologyJson.sites).map(siteIndex => {
      let site = topologyJson.sites[siteIndex];
      sitesByName[site.name] = site;
    });
    // index nodes by name
    let nodesByName = {};
    Object.keys(topologyJson.nodes).map(nodeIndex => {
      let node = topologyJson.nodes[nodeIndex];
      nodesByName[node.name] = node;
    });
    let linksByName = {};
    Object.keys(topologyJson.links).map(linkIndex => {
      let link = topologyJson.links[linkIndex];
      linksByName[link.name] = link;
      // calculate distance and angle for each link
      if (!nodesByName.hasOwnProperty(link.a_node_name) ||
          !nodesByName.hasOwnProperty(link.z_node_name)) {
        console.error('Skipping invalid link', link);
        return;
      }
      let aNode = nodesByName[link.a_node_name];
      let zNode = nodesByName[link.z_node_name];
      if (!sitesByName.hasOwnProperty(aNode.site_name) ||
          !sitesByName.hasOwnProperty(zNode.site_name)) {
        console.error('Skipping invalid link', link);
        return;
      }
      let aSite = sitesByName[aNode.site_name];
      let zSite = sitesByName[zNode.site_name];
      let aSiteCoords = new LatLng(aSite.location.latitude,
                                   aSite.location.longitude);
      let zSiteCoords = new LatLng(zSite.location.latitude,
                                   zSite.location.longitude);
      let linkAngle = LeafletGeom.bearing(aSiteCoords, zSiteCoords);
      link.angle = linkAngle;
      let linkLength = LeafletGeom.length([aSiteCoords, zSiteCoords]);
      link.distance = parseInt(linkLength * 100) / 100; /* meters */
      // apply health data
      if (this.state.linkHealth &&
          this.state.linkHealth.metrics &&
          link.name in this.state.linkHealth.metrics) {
        let nodeHealth = this.state.linkHealth.metrics[link.name];
        link["alive_perc"] = nodeHealth.alive;
      }

      if (this.state.linkOverlayData) {
        let modLinkName = link.name.replace(/\./g, ' ') + ' (A)';
        let overlayValue = this.state.linkOverlayData.at(0).get(modLinkName);
        link["overlay_a"] = overlayValue;
        modLinkName = link.name.replace(/\./g, ' ') + ' (Z)';
        overlayValue = this.state.linkOverlayData.at(0).get(modLinkName);
        link["overlay_z"] = overlayValue;
      } else if (this.props.linkOverlay == "RxGolayIdx" || this.props.linkOverlay == "TxGolayIdx") {
        let a_node = nodesByName[link.a_node_name];
        let z_node = nodesByName[link.z_node_name];

        if (a_node && a_node.golay_idx) {
          let idx = this.props.linkOverlay == "RxGolayIdx" ?
                    a_node.golay_idx.rxGolayIdx :
                    a_node.golay_idx.txGolayIdx;
          link["overlay_a"] = parseInt(Buffer.from(idx.buffer.data).readUIntBE(0, 8));
        }
        if (z_node && z_node.golay_idx) {
          let idx = this.props.linkOverlay == "RxGolayIdx" ?
                    z_node.golay_idx.rxGolayIdx :
                    z_node.golay_idx.txGolayIdx;
          link["overlay_z"] = parseInt(Buffer.from(idx.buffer.data).readUIntBE(0, 8));
        }
      }
    });
    // reset the zoom when a new topology is selected
    let resetZoom = this.resetZoomOnNextRefresh;
    // update helper maps
    this.resetZoomOnNextRefresh = false;
    this.nodesByName = nodesByName;
    this.linksByName = linksByName;
    this.sitesByName = sitesByName;
    // update zoom level
    let zoomLevel = resetZoom ? networkConfig.zoom_level : this.state.zoomLevel;
    this.setState({
      zoomLevel: zoomLevel,
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
      upperPaneHeight: newSize,
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
      upperPaneHeight: (this.state.tablesExpanded ? window.innerHeight: window.innerHeight - this.state.lowerPaneHeight),
      tablesExpanded: this.state.tablesExpanded ? false : true,
    });
  }

  getSiteMarker(pos, color, siteIndex): ReactElement<any> {
    let radiusByZoomLevel = this.state.zoomLevel - 9;
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
    let weightByZoomLevel = this.state.zoomLevel - 8;
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

  getLinkLineTwoSides(link, coords, color_a, color_z): ReactElement<any> {
    let coords_a = coords[0];
    let coords_z = coords[1];
    let midPoint = [(coords_a[0] + coords_z[0]) /2, (coords_a[1] + coords_z[1]) /2];
    return ([
      <Polyline
        key={link.name+'(A)'}
        positions={[coords_a, midPoint]}
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
        color={color_a}
        level={5}>
      </Polyline>,
      <Polyline
        key={link.name+'(Z)'}
        positions={[coords_z, midPoint]}
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
        color={color_z}
        level={5}>
      </Polyline>]);
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
    // assign pending sites, marking them with a pending flag
    if (this.props.pendingTopology &&
        this.props.pendingTopology.sites &&
        this.props.pendingTopology.nodes &&
        this.props.pendingTopology.links) {
      this.props.pendingTopology.sites.forEach(site => {
        let pendingSite = Object.assign({}, site);
        pendingSite.pending = true;
        topology.sites.push(pendingSite);
      });
      this.props.pendingTopology.nodes.forEach(node => {
        let pendingNode = Object.assign({}, node);
        pendingNode.pending = true;
        topology.nodes.push(pendingNode);
      });
      this.props.pendingTopology.links.forEach(link => {
        let pendingLink = Object.assign({}, link);
        pendingLink.pending = true;
        topology.links.push(pendingLink);
      });
    }

    Object.keys(topology.sites).map(siteIndex => {
      let site = topology.sites[siteIndex];
      if (!site.location) {
        site.location = {};
        site.location.latitude = 0;
        site.location.longitude = 0;
      }
      let siteCoords = [site.location.latitude, site.location.longitude];

      let healthyCount = 0;
      let totalCount = 0;
      let hasPop = false;
      let hasMac = false;
      let isCn = false;
      let sitePolarity = null;
      Object.keys(topology.nodes).map(nodeIndex => {
        let node = topology.nodes[nodeIndex];
        if (node.site_name == site.name) {
          totalCount++;
          healthyCount += (node.status == 2 || node.status == 3) ? 1 : 0;
          if (sitePolarity == null) {
            sitePolarity = node.polarity;
          }
          // mark as hybrid if anything in the site differs
          sitePolarity = node.polarity != sitePolarity ? 3 : sitePolarity;
          hasPop = node.pop_node ? true : hasPop;
          // TODO: check for mixed sites (error)
          isCn = node.node_type == 1 ? true : isCn;
          hasMac = node.hasOwnProperty('mac_addr') && node.mac_addr && node.mac_addr.length ? true : hasMac;
        }
      });

      let contextualMarker = null;
      if (site.hasOwnProperty('pending') && site.pending) {
        contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Pending.Site, siteIndex);
      } else {
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
            contextualMarker = this.getSiteMarker(siteCoords, polarityColor(sitePolarity), siteIndex);
            break;
          default:
            contextualMarker = this.getSiteMarker(siteCoords, SiteOverlayKeys.Health.Unhealthy.color);
        }
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
      } else if (isCn) {
        let secondaryMarker =
          <CircleMarker center={siteCoords}
            radius={5}
            clickable
            fillOpacity={1}
            color="pink"
            key={"pop-node" + siteIndex}
            siteIndex={siteIndex}
            onClick={this.handleMarkerClick}
            fillColor="pink"
            level={11}/>;
        siteComponents.push(secondaryMarker);
      } else if (!hasMac) {
        // no macs for this site
        let secondaryMarker =
          <CircleMarker center={siteCoords}
            radius={this.state.zoomLevel - 12}
            clickable
            fillOpacity={1}
            color="white"
            key={"pop-node" + siteIndex}
            siteIndex={siteIndex}
            onClick={this.handleMarkerClick}
            fillColor="white"
            level={11}/>;
        siteComponents.push(secondaryMarker);
      }
    });

    let ignitionLinks = new Set(this.props.networkConfig.ignition_state);
    topology.links.map(link => {
      if (link.link_type != 1) {
        return;
      }
      if (!this.nodesByName.hasOwnProperty(link.a_node_name) ||
          !this.nodesByName.hasOwnProperty(link.z_node_name)) {
        return;
      }
      let aSite = this.nodesByName[link.a_node_name].site_name;
      let zSite = this.nodesByName[link.z_node_name].site_name;
      if (!this.sitesByName.hasOwnProperty(aSite) ||
          !this.sitesByName.hasOwnProperty(zSite)) {
        console.error('Node defined invalid site:', aSite, zSite);
        return;
      }
      let aNodeSite = this.sitesByName[aSite];
      let zNodeSite = this.sitesByName[zSite];

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
      if (this.state.routingOverlayEnabled) {
        if (this.state.routeWeights && this.state.routeWeights[link.name]) {
          var bwUsageColor = d3.scaleLinear()
              .domain([0, 100])
              .range(['white', '#4169e1']);
          var linkColor = d3.rgb(bwUsageColor(this.state.routeWeights[link.name]));
          linkLine = this.getLinkLine(link, linkCoords, linkColor);
        }
      } else {
        let overlayKey = linkOverlayKeys[this.props.linkOverlay];
        switch (this.props.linkOverlay) {
          case 'Health':
            // TODO - move color assignment into separate function for legend
            if (link.is_alive) {
              linkLine = this.getLinkLine(link, linkCoords, 'green');
            } else if (ignitionLinks.has(link.name)) {
              linkLine = this.getLinkLine(link, linkCoords, 'purple');
            } else {
              linkLine = this.getLinkLine(link, linkCoords, 'red');
            }
            break;
          case 'Uptime':
            let color = overlayKey.colors[overlayKey.values.length];
            if (link.hasOwnProperty("alive_perc")) {
              for (var i = 0; i < overlayKey.values.length; ++i) {
                if (link.alive_perc < overlayKey.values[i]) {
                  color = overlayKey.colors[i];
                  break;
                }
              }
              linkLine = this.getLinkLine(link, linkCoords, color);
            } else {
              linkLine = this.getLinkLine(link, linkCoords, 'grey');
            }
            break;
          case 'RxGolayIdx':
          case 'TxGolayIdx':
            color_a = 'grey';
            color_z = 'grey';
            if (link.hasOwnProperty("overlay_a")) {
              for (var i = 0; i < overlayKey.values.length; ++i) {
                if (link.overlay_a == overlayKey.values[i]) {
                  color_a = overlayKey.colors[i];
                  break;
                }
              }
            }
            if (link.hasOwnProperty("overlay_z")) {
              for (var i = 0; i < overlayKey.values.length; ++i) {
                if (link.overlay_z == overlayKey.values[i]) {
                  color_z = overlayKey.colors[i];
                  break;
                }
              }
            }
            linkLine = this.getLinkLineTwoSides(link, linkCoords, color_a, color_z);
            break;
          case 'SNR':
          case 'MCS':
          case 'RSSI':
            let color_a = overlayKey.colors[overlayKey.values.length];
            let color_z = overlayKey.colors[overlayKey.values.length];
            if (this.state.linkOverlayData && link.hasOwnProperty("overlay_a")) {
              for (var i = 0; i < overlayKey.values.length; ++i) {
                if (link.overlay_a < overlayKey.values[i]) {
                  color_a = overlayKey.colors[i];
                  break;
                }
              }
            } else {
              color_a = 'grey';
            }
            if (this.state.linkOverlayData && link.hasOwnProperty("overlay_z")) {
              for (var i = 0; i < overlayKey.values.length; ++i) {
                if (link.overlay_z < overlayKey.values[i]) {
                  color_z = overlayKey.colors[i];
                  break;
                }
              }
            } else {
              color_z = 'grey';
            }
            linkLine = this.getLinkLineTwoSides(link, linkCoords, color_a, color_z);
            break;
          case 'FLAPS':
            // flaps is a special case, can use health data to count # of events
            if (this.state.linkHealth.hasOwnProperty('metrics') &&
                this.state.linkHealth.metrics.hasOwnProperty(link.name)) {
              // we have health data for this link
              let linkHealthEvents = this.state.linkHealth.metrics[link.name].events.length;
              // linear scaling
              let healthScaleColor = d3.scaleLinear()
                  .domain([0, 5, 15, 100])
                  .range(['#006600', '#7f9900', '#b34a00', '#990000']);
              let linkColor = d3.rgb(healthScaleColor(linkHealthEvents));
              linkLine = this.getLinkLine(link, linkCoords, linkColor);
            } else {
              // no data
              linkLine = this.getLinkLine(link, linkCoords, 'black');
            }
            break;
          default:
            linkLine = this.getLinkLine(link, linkCoords, 'grey');
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
    let topologyIssuesControl;

    const maxModalHeight = this.state.upperPaneHeight - 120; // offset
    if (this.state.detailsExpanded) {
      if (this.state.selectedLink) {
        layersControl =
          <Control position="topright">
            <DetailsLink topologyName={this.props.networkConfig.topology.name}
                         link={this.state.selectedLink}
                         nodes={this.nodesByName}
                         maxHeight={maxModalHeight}
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
                         maxHeight={maxModalHeight}
                         onClose={() => this.setState({detailsExpanded: false})}
            />
          </Control>
      } else if (this.state.selectedSite) {
        let site = this.sitesByName[this.state.selectedSite];
        // determine color to use per link connected to the site
        // first get nodes connected to the site
        // second get links connected to the nodes
        layersControl =
          <Control position="topright">
            <DetailsSite topologyName={this.props.networkConfig.topology.name}
                         site={site}
                         sites={this.sitesByName}
                         nodes={this.nodesByName}
                         links={this.linksByName}
                         maxHeight={maxModalHeight}
                         onClose={() => this.setState({detailsExpanded: false})}
            />
          </Control>
      } else {
        showOverview = true;
      }
    }
    if (showOverview) {
      // overview
      layersControl =
        <Control position="topright">
          <DetailsTopology topologyName={this.props.networkConfig.topology.name}
                           topology={this.props.networkConfig.topology}
                           nodes={this.nodesByName}
                           links={this.linksByName}
                           maxHeight={maxModalHeight}
                           onClose={() => this.setState({detailsExpanded: false})}
          />
        </Control>;
    }
    if (this.state.showTopologyIssuesPane) {
      topologyIssuesControl =
        <Control position="topleft">
          <DetailsTopologyIssues topology={this.props.networkConfig.topology}
                                 maxHeight={maxModalHeight}
                                 newTopology={this.state.newTopology} />
        </Control>;
    }

    let tablesControl =
      <Control position="bottomright" >
        <img style={{backgroundColor: "rgba(245, 245, 245, 0.8)"}} src={this.state.tablesExpanded? "/static/images/table.png" : "/static/images/table-accent.png"} onClick={this.handleExpandTablesClick}/>
      </Control>


    let tileUrl = CONFIG.use_tile_proxy ?
        '/tile/{s}/{z}/{x}/{y}.png' :
        window.location.protocol + '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

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
              maxHeight={maxModalHeight}
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
            {topologyIssuesControl}
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
