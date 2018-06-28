/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// ui components
import NetworkDataTable from './NetworkDataTable.js';
import Dispatcher from './NetworkDispatcher.js';
import {polarityColor} from './helpers/NetworkHelpers.js';
import DetailsLegend from './components/detailpanels/DetailsLegend.js';
import DetailsLink from './components/detailpanels/DetailsLink.js';
import DetailsNode from './components/detailpanels/DetailsNode.js';
import DetailsCreateOrEditSite from './components/detailpanels/DetailsCreateOrEditSite.js';
import DetailsSite from './components/detailpanels/DetailsSite.js';
import DetailsTopology from './components/detailpanels/DetailsTopology.js';
import DetailsTopologyIssues from './components/detailpanels/DetailsTopologyIssues.js';
// dispatcher
import {
  Actions,
  SiteOverlayKeys,
  LinkOverlayKeys,
  MapDimensions,
  MapTiles,
} from './constants/NetworkConstants.js';
import {
  apiServiceRequest,
  getErrorTextFromE2EAck,
} from './apiutils/ServiceAPIUtil';
// helper methods
import {getNodeMarker} from './helpers/NetworkMapHelpers.js';
import NetworkStore from './stores/NetworkStore.js';
import {rgb, scaleLinear} from 'd3';
import LeafletGeom from 'leaflet-geometryutil';
// leaflet maps
import {isEmpty} from 'lodash-es';
import Leaflet, {LatLng} from 'leaflet';
import Control from 'react-leaflet-control';
import {
  Map,
  Polyline,
  TileLayer,
  Marker,
  CircleMarker,
  LayerGroup,
} from 'react-leaflet';
import SplitPane from 'react-split-pane';
import React from 'react';
import PropTypes from 'prop-types';
import swal from 'sweetalert';

const SITE_MARKER = Leaflet.icon({
  iconAnchor: [25, 25],
  iconSize: [50, 50],
  iconUrl: '/static/images/site.png',
});

export class CustomMap extends Map {
  createLeafletElement(props: Object): Object {
    return Leaflet.map(this.container, props);
  }
  componentDidUpdate(prevProps: Object) {
    this.updateLeafletElement(prevProps, this.props);
    const layers = this.leafletElement._layers;
    Object.values(layers)
      .filter(layer => {
        return typeof layer.options.level !== 'undefined';
      })
      .sort((layerA, layerB) => {
        return layerA.options.level - layerB.options.level;
      })
      .forEach(layer => {
        layer.bringToFront();
      });
  }
}

export default class NetworkMap extends React.Component {
  static propTypes = {
    commitPlan: PropTypes.shape({
      canaryLinks: PropTypes.arrayOf(PropTypes.string),
      commitBatches: PropTypes.array,
    }),
    linkOverlay: PropTypes.string.isRequired,
    mapDimType: PropTypes.string.isRequired,
    mapTile: PropTypes.string.isRequired,
    networkConfig: PropTypes.object.isRequired,
    networkName: PropTypes.string.isRequired,
    pendingTopology: PropTypes.object.isRequired,
    siteOverlay: PropTypes.string.isRequired,
    viewContext: PropTypes.object.isRequired,
  };

  state = {
    analyzerTable: {},
    detailsExpanded: true,
    hoveredSite: null,
    linkHealth: {},
    linkOverlayData: {},
    lowerPaneHeight: window.innerHeight / 2,
    newTopology: {},
    plannedSite: null,
    routeDestNode: null,
    routeSourceNode: null,
    routeWeights: {},
    routingOverlayEnabled: false,
    selectedLink: null,
    selectedSite: null,
    siteToEdit: null,
    recentlyEditedSite: null, // Show location of new site until topology updates
    showTopologyIssuesPane: false,
    sortName: undefined,
    sortOrder: undefined,
    tablesExpanded: true,
    upperPaneHeight: window.innerHeight / 2,
    zoomLevel: 18,
  };

  nodesByName = {};
  linksByName = {};
  linksByNode = {};
  sitesByName = {};

  // reset zoom on next refresh is set once a new topology is selected
  resetZoomOnNextRefresh = true;

  markerRef = React.createRef();
  mapRef = React.createRef();
  nodesRef = React.createRef();
  splitPaneRef = React.createRef();
  plannedSiteMarkerRef = React.createRef();
  siteToEditRef = React.createRef();

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (
      this.props.networkConfig.topology.name !=
      nextProps.networkConfig.topology.name
    ) {
      this.resetZoomOnNextRefresh = true;
    }
    this.updateTopologyState(nextProps.networkConfig);
  }

  resizeWindow = event => {
    this.mapRef.current.leafletElement.invalidateSize();

    this.setState({
      // TODO: hacky, we need the Math.min here because the resize can happen
      // in 2 ways:
      // 1. both panes resize at the same time
      // 2. the upper one shrinks when it has the height of the whole window
      lowerPaneHeight: this.state.tablesExpanded
        ? window.innerHeight -
          this.splitPaneRef.current.splitPane.childNodes[0].clientHeight
        : this.state.lowerPaneHeight,
      upperPaneHeight: Math.min(
        window.innerHeight,
        this.splitPaneRef.current.splitPane.childNodes[0].clientHeight,
      ),
    });
  };

  UNSAFE_componentWillMount() {
    // register once we're visible
    this.dispatchToken = Dispatcher.register(
      this.handleDispatchEvent.bind(this),
    );
    window.addEventListener('resize', this.resizeWindow);
    this.setState({
      analyzerTable: NetworkStore.analyzerTable,
      linkHealth: NetworkStore.linkHealth,
    });
    // update helper maps
    this.updateTopologyState(this.props.networkConfig);
    // initial site selection
    if (
      NetworkStore.tabName == 'links' &&
      NetworkStore.selectedName &&
      this.linksByName.hasOwnProperty(NetworkStore.selectedName)
    ) {
      this.setState({
        selectedLink: this.linksByName[NetworkStore.selectedName],
      });
    } else if (
      NetworkStore.tabName == 'nodes' &&
      NetworkStore.selectedName &&
      this.sitesByName.hasOwnProperty(NetworkStore.selectedName)
    ) {
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
          plannedSite: null,
          recentlyEditedSite: null,
          routingOverlayEnabled: false,
          selectedLink: null,
          selectedNode: null,
          selectedSite: null,
          siteToEdit: null,
        });
        break;
      case Actions.NODE_SELECTED: {
        const site = this.nodesByName[payload.nodeSelected].site_name;
        this.setState({
          selectedLink: null,
          selectedNode: payload.nodeSelected,
          selectedSite: site,
        });
        break;
      }
      case Actions.LINK_SELECTED:
        this.setState({
          selectedLink: payload.link,
          selectedNode: null,
          selectedSite: null,
        });
        break;
      case Actions.SITE_SELECTED:
        this.setState({
          selectedLink: null,
          selectedNode: null,
          selectedSite: payload.siteSelected,
        });
        break;
      case Actions.DISPLAY_ROUTE:
        this.setState({
          routeDestNode: payload.routeDestNode,
          routeSourceNode: payload.routeSourceNode,
          routeWeights: payload.routeWeights,
          routingOverlayEnabled: true,
          selectedLink: null,
          selectedNode: null,
          selectedSite: null,
        });
        break;
      case Actions.CLEAR_ROUTE:
        this.setState({
          routeDestNode: null,
          routeSourceNode: null,
          routeWeights: null,
          routingOverlayEnabled: false,
        });
        break;
      case Actions.PLANNED_SITE_CREATE: {
        if (this.state.siteToEdit) {
          // Don't allow creation of new sites when editing
          swal({
            title: 'Unable to Create Site',
            text: 'Please finish editing your site before creating a new one.',
            type: 'warning',
            closeOnConfirm: true,
          });
          return;
        }

        const plannedSite = {
          location: {
            altitude: 0,
            latitude: this.props.networkConfig
              ? this.props.networkConfig.latitude
              : 37.484494,
            longitude: this.props.networkConfig
              ? this.props.networkConfig.longitude
              : -122.1483976,
          },
          name: payload.siteName,
        };

        this.setState({
          plannedSite,
        });

        swal({
          title: 'Planned Site Added',
          text:
            'Drag the planned site on the map to desired location. Then, you can commit it from the details menu.',
          type: 'info',
          closeOnConfirm: true,
        });

        break;
      }
      case Actions.START_SITE_EDIT: {
        const site = this.sitesByName[payload.siteName];
        this.setState({
          hoveredSite: null,
          siteToEdit: {
            ...site,
            oldName: site.name,
          },
          selectedSite: null,
        });
        break;
      }
      case Actions.CLEAR_NODE_LINK_SELECTED:
        this.setState({
          selectedLink: null,
          selectedNode: null,
          selectedSite: null,
        });
        break;
      case Actions.HEALTH_REFRESHED:
        this.setState({
          linkHealth: payload.linkHealth,
        });
        break;
      case Actions.ANALYZER_REFRESHED:
        this.setState({
          analyzerTable: payload.analyzerTable,
        });
        break;
      case Actions.LINK_OVERLAY_REFRESHED:
        if (payload.overlay) {
          this.setState({
            linkOverlayData: payload.overlay,
          });
        } else {
          this.setState({
            linkOverlayData: {},
          });
        }
        break;
      case Actions.TOPOLOGY_ISSUES_PANE:
        this.setState({
          newTopology: payload.topology,
          showTopologyIssuesPane: payload.visible,
        });
        break;
    }
  }

  updateTopologyState(networkConfig) {
    const topologyJson = networkConfig.topology;
    // index sites by name
    const sitesByName = {};
    Object.keys(topologyJson.sites).map(siteIndex => {
      const site = topologyJson.sites[siteIndex];
      sitesByName[site.name] = site;
    });
    // index nodes by name
    const nodesByName = {};
    Object.keys(topologyJson.nodes).map(nodeIndex => {
      const node = topologyJson.nodes[nodeIndex];
      nodesByName[node.name] = node;
    });
    const linksByName = {};
    const linksByNode = {};
    Object.keys(topologyJson.links).map(linkIndex => {
      const link = topologyJson.links[linkIndex];
      linksByName[link.name] = link;
      // calculate distance and angle for each link
      if (
        !nodesByName.hasOwnProperty(link.a_node_name) ||
        !nodesByName.hasOwnProperty(link.z_node_name)
      ) {
        console.error('Skipping invalid link', link);
        return;
      }
      const aNode = nodesByName[link.a_node_name];
      const zNode = nodesByName[link.z_node_name];
      if (
        !sitesByName.hasOwnProperty(aNode.site_name) ||
        !sitesByName.hasOwnProperty(zNode.site_name)
      ) {
        console.error('Skipping invalid link', link);
        return;
      }

      linksByNode[link.a_node_name] = linksByNode[link.a_node_name]
        ? linksByNode[link.a_node_name].concat(link)
        : [link];

      linksByNode[link.z_node_name] = linksByNode[link.z_node_name]
        ? linksByNode[link.z_node_name].concat(link)
        : [link];

      const aSite = sitesByName[aNode.site_name];
      const zSite = sitesByName[zNode.site_name];
      const aSiteCoords = new LatLng(
        aSite.location.latitude,
        aSite.location.longitude,
      );
      const zSiteCoords = new LatLng(
        zSite.location.latitude,
        zSite.location.longitude,
      );
      const linkAngle = LeafletGeom.bearing(aSiteCoords, zSiteCoords);
      link.angle = linkAngle;
      const linkLength = LeafletGeom.length([aSiteCoords, zSiteCoords]);
      link.distance = parseInt(linkLength * 100, 10) / 100; /* meters */
      // apply health data
      if (
        this.state.linkHealth &&
        this.state.linkHealth.metrics &&
        this.state.linkHealth.metrics.hasOwnProperty(link.name)
      ) {
        const nodeHealth = this.state.linkHealth.metrics[link.name];
        link.alive_perc = nodeHealth.alive;
      }

      if (
        typeof this.state.linkOverlayData === 'object' &&
        Object.keys(this.state.linkOverlayData).length > 0
      ) {
        if (this.state.linkOverlayData.hasOwnProperty(link.name)) {
          link.overlay_a = this.state.linkOverlayData[link.name];
          link.overlay_z = this.state.linkOverlayData[link.name];
        }
        return;
        // TODO - A/Z
        // let modLinkName = link.name.replace(/\./g, ' ') + ' (A)';
        // let overlayValue = this.state.linkOverlayData.at(0).get(modLinkName);
        // link.overlay_a = overlayValue;
        // modLinkName = link.name.replace(/\./g, ' ') + ' (Z)';
        // overlayValue = this.state.linkOverlayData.at(0).get(modLinkName);
        // link.overlay_z = overlayValue;
      } else if (
        this.props.linkOverlay == 'RxGolayIdx' ||
        this.props.linkOverlay == 'TxGolayIdx'
      ) {
        const a_node = nodesByName[link.a_node_name];
        const z_node = nodesByName[link.z_node_name];

        if (link.golay_idx) {
          const idx =
            this.props.linkOverlay == 'RxGolayIdx'
              ? link.golay_idx.rxGolayIdx
              : link.golay_idx.txGolayIdx;
          link.overlay_a = idx;
          link.overlay_z = idx;
        } else {
          if (a_node && a_node.golay_idx) {
            const idx =
              this.props.linkOverlay == 'RxGolayIdx'
                ? a_node.golay_idx.rxGolayIdx
                : a_node.golay_idx.txGolayIdx;
            link.overlay_a = idx;
          }
          if (z_node && z_node.golay_idx) {
            const idx =
              this.props.linkOverlay == 'RxGolayIdx'
                ? z_node.golay_idx.rxGolayIdx
                : z_node.golay_idx.txGolayIdx;
            link.overlay_z = idx;
          }
        }
      }
    });
    // reset the zoom when a new topology is selected
    const resetZoom = this.resetZoomOnNextRefresh;
    // update helper maps
    this.resetZoomOnNextRefresh = false;
    this.nodesByName = nodesByName;
    this.linksByName = linksByName;
    this.linksByNode = linksByNode;
    this.sitesByName = sitesByName;
    // update zoom level
    const zoomLevel = resetZoom
      ? networkConfig.zoom_level
      : this.state.zoomLevel;
    this.setState({
      zoomLevel,
    });
  }

  componentDidMount() {
    this.mapRef.current.leafletElement.invalidateSize();
  }

  onMapZoom = data => {
    this.setState({
      zoomLevel: data.target._zoom,
    });
  };

  paneChange = newSize => {
    this.mapRef.current.leafletElement.invalidateSize();
    this.setState({
      lowerPaneHeight: window.innerHeight - newSize,
      upperPaneHeight: newSize,
    });
  };

  handleMarkerClick = ev => {
    if (this.state.plannedSite || this.state.siteToEdit) {
      // Don't allow re-selection if a site is being edited
      return;
    }

    const site = this.props.networkConfig.topology.sites[
      ev.target.options.siteIndex
    ];
    // dispatch to update all UIs
    Dispatcher.dispatch({
      actionType: Actions.TAB_SELECTED,
      tabName: 'nodes',
    });
    Dispatcher.dispatch({
      actionType: Actions.SITE_SELECTED,
      siteSelected: site.name,
    });
  };

  handleMarkerHover = hoveredSite => {
    if (this.state.plannedSite || this.state.siteToEdit) {
      // Don't allow hovering if a site is being edited
      return;
    }

    this.setState({hoveredSite});
  };

  handleExpandTablesClick = ev => {
    setTimeout(() => {
      this.mapRef.current.leafletElement.invalidateSize();
    }, 1);
    this.setState({
      tablesExpanded: !this.state.tablesExpanded,
      upperPaneHeight: this.state.tablesExpanded
        ? window.innerHeight
        : window.innerHeight - this.state.lowerPaneHeight,
    });
  };

  addNodeMarkerForSite(topology, site) {
    const nodesInSite = topology.nodes.filter(node => {
      return node.site_name === site.name;
    });

    if (this.nodesRef.current) {
      const nodeMarkersForSite = getNodeMarker(
        [site.location.latitude, site.location.longitude],
        nodesInSite,
        this.linksByNode,
        this.state.selectedNode,
        () => this.setState({hoveredSite: site}),
        () => this.setState({hoveredSite: null}),
      );
      nodeMarkersForSite.addTo(this.nodesRef.current.leafletElement);
    }
  }

  getSiteMarker = (
    site,
    pos,
    color,
    hasAp,
    hasPop,
    isCn,
    hasMac,
    siteIndex,
  ): React.Element<any> => {
    let apMarker = null;
    let secondaryMarkerColor = null;

    if (hasAp) {
      apMarker = (
        <CircleMarker
          center={pos}
          radius={this.state.zoomLevel - 5}
          weight={4}
          clickable
          fill={false}
          color="purple"
          key={'ap-site ' + site.name}
          siteIndex={siteIndex}
          onClick={this.handleMarkerClick}
          level={11}
        />
      );
    }

    if (hasPop) {
      secondaryMarkerColor = 'blue';
    } else if (isCn) {
      secondaryMarkerColor = 'pink';
    } else if (!hasMac) {
      secondaryMarkerColor = 'white';
    }

    return (
      <CircleMarker
        center={pos}
        // TODO: Scale Radius to zoomLevel
        radius={MapDimensions[this.props.mapDimType].SITE_RADIUS}
        clickable
        fillOpacity={1}
        color={color}
        key={site.name}
        siteIndex={siteIndex}
        onClick={this.handleMarkerClick}
        onMouseOver={() => this.handleMarkerHover(site)}
        onMouseOut={() => this.handleMarkerHover(null)}
        fillColor={color}
        level={10}>
        {apMarker}
        {secondaryMarkerColor && (
          <CircleMarker
            center={pos}
            radius={this.state.zoomLevel - 12}
            clickable
            fillOpacity={1}
            color={secondaryMarkerColor}
            key={'pop-node ' + site.name}
            siteIndex={siteIndex}
            onClick={this.handleMarkerClick}
            fillColor={secondaryMarkerColor}
            level={11}
          />
        )}
      </CircleMarker>
    );
  };

  getLinkLine(link, coords, color): React.Element<any> {
    return (
      <Polyline
        key={link.name}
        positions={coords}
        weight={MapDimensions[this.props.mapDimType].LINK_LINE_WEIGHT}
        onClick={e => {
          Dispatcher.dispatch({
            actionType: Actions.TAB_SELECTED,
            tabName: 'links',
          });
          Dispatcher.dispatch({
            actionType: Actions.LINK_SELECTED,
            link,
            source: 'map',
          });
        }}
        color={color}
        level={5}
      />
    );
  }

  getLinkLineTwoSides(link, coords, color_a, color_z): React.Element<any> {
    const coords_a = coords[0];
    const coords_z = coords[1];
    const midPoint = [
      (coords_a[0] + coords_z[0]) / 2,
      (coords_a[1] + coords_z[1]) / 2,
    ];
    return [
      <Polyline
        key={link.name + '(A)'}
        positions={[coords_a, midPoint]}
        weight={MapDimensions[this.props.mapDimType].LINK_LINE_WEIGHT}
        onClick={e => {
          Dispatcher.dispatch({
            actionType: Actions.TAB_SELECTED,
            tabName: 'links',
          });
          Dispatcher.dispatch({
            actionType: Actions.LINK_SELECTED,
            link,
            source: 'map',
          });
        }}
        color={color_a}
        level={5}
      />,
      <Polyline
        key={link.name + '(Z)'}
        positions={[coords_z, midPoint]}
        weight={MapDimensions[this.props.mapDimType].LINK_LINE_WEIGHT}
        onClick={e => {
          Dispatcher.dispatch({
            actionType: Actions.TAB_SELECTED,
            tabName: 'links',
          });
          Dispatcher.dispatch({
            actionType: Actions.LINK_SELECTED,
            link,
            source: 'map',
          });
        }}
        color={color_z}
        level={5}
      />,
    ];
  }

  updatePlannedPosition = () => {
    const {
      lat,
      lng,
    } = this.plannedSiteMarkerRef.current.leafletElement.getLatLng();
    this.setState({
      plannedSite: {
        ...this.state.plannedSite,
        location: {
          ...this.state.plannedSite.location,
          latitude: lat,
          longitude: lng,
        },
      },
    });
  };

  updatePlannedSite = plannedSite => {
    this.setState({plannedSite});
  };

  commitPlannedSite = plannedSite => {
    const topologyName = this.props.networkConfig.topology.name;

    swal(
      {
        title: 'Are you sure?',
        text: 'You are adding a site to this topology!',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Confirm',
        closeOnConfirm: false,
      },
      () => {
        const data = {site: plannedSite};

        apiServiceRequest(topologyName, 'addSite', data)
          .then(response => {
            swal({
              title: 'Site Added!',
              text: 'Response: ' + response.data.message,
              type: 'success',
            });

            this.setState({plannedSite: null});
          })
          .catch(error =>
            swal({
              title: 'Failed!',
              text:
                'Adding a site failed!\nReason: ' +
                getErrorTextFromE2EAck(error),
              type: 'error',
            }),
          )
          .finally(() => {
            this.enableMapScrolling();
          });
      },
    );
  };

  updateSiteToEditPosition = () => {
    const {lat, lng} = this.siteToEditRef.current.leafletElement.getLatLng();
    this.setState({
      siteToEdit: {
        ...this.state.siteToEdit,
        location: {
          ...this.state.siteToEdit.location,
          latitude: lat,
          longitude: lng,
        },
      },
    });
  };

  updateSiteToEdit = siteToEdit => {
    this.setState({siteToEdit});
  };

  editSite = siteToEdit => {
    const topologyName = this.props.networkConfig.topology.name;

    swal(
      {
        title: 'Confirm Changes to Site',
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Confirm',
        closeOnConfirm: false,
      },
      () => {
        const data = {
          siteName: siteToEdit.oldName,
          newSite: siteToEdit,
        };

        apiServiceRequest(topologyName, 'editSite', data)
          .then(response => {
            swal({
              title: 'Site Modified!',
              text: 'Response: ' + response.data.message,
              type: 'success',
            });

            this.setState({
              recentlyEditedSite: siteToEdit,
              siteToEdit: null,
            });
          })
          .catch(error =>
            swal({
              title: 'Failed!',
              text:
                'Updating site failed\nReason: ' +
                getErrorTextFromE2EAck(error),
              type: 'error',
            }),
          )
          .finally(() => {
            this.enableMapScrolling();
          });
      },
    );
  };

  updatePosition() {
    const {lat, lng} = this.markerRef.current.leafletElement.getLatLng();
    this.setState({
      marker: {lat, lng},
    });
  }

  enableMapScrolling = () => {
    this.mapRef.current.leafletElement.scrollWheelZoom.enable();
  };

  disableMapScrolling = () => {
    this.mapRef.current.leafletElement.scrollWheelZoom.disable();
  };

  closeModal = () => {
    this.enableMapScrolling();
    this.setState({detailsExpanded: false});
  };

  render() {
    const {selectedSite, siteToEdit, recentlyEditedSite} = this.state;

    if (this.nodesRef.current) {
      // clear the nodes layer
      this.nodesRef.current.leafletElement.clearLayers();
    }

    // use the center position from the topology if set
    const centerPosition = this.props.networkConfig
      ? [this.props.networkConfig.latitude, this.props.networkConfig.longitude]
      : [37.484494, -122.1483976];
    const siteComponents = [];
    const linkComponents = [];
    let siteMarkers = [];
    const topology = this.props.networkConfig.topology;
    // assign pending sites, marking them with a pending flag
    if (
      this.props.pendingTopology &&
      this.props.pendingTopology.sites &&
      this.props.pendingTopology.nodes &&
      this.props.pendingTopology.links
    ) {
      this.props.pendingTopology.sites.forEach(site => {
        const pendingSite = Object.assign({}, site);
        pendingSite.pending = true;
        topology.sites.push(pendingSite);
      });
      this.props.pendingTopology.nodes.forEach(node => {
        const pendingNode = Object.assign({}, node);
        pendingNode.pending = true;
        topology.nodes.push(pendingNode);
      });
      this.props.pendingTopology.links.forEach(link => {
        const pendingLink = Object.assign({}, link);
        pendingLink.pending = true;
        topology.links.push(pendingLink);
      });
    }

    topology.sites.forEach((site, siteIndex) => {
      if (siteToEdit && site.name === siteToEdit.oldName) {
        // If the site is being edited, it will be rendered later
        return;
      }

      if (recentlyEditedSite && site.name === recentlyEditedSite.oldName) {
        site = recentlyEditedSite;
      }

      if (!site.location) {
        site.location = {
          latitude: 0,
          longitude: 0,
        };
      }

      let healthyCount = 0;
      let totalCount = 0;
      const inCommitBatch = 0;
      let hasPop = false;
      let hasMac = false;
      let isCn = false;
      const hasAp = site.hasOwnProperty('ruckus');
      let sitePolarity = null;

      const siteCoords = [site.location.latitude, site.location.longitude];

      const nodeKeysInSite = Object.keys(topology.nodes).filter(nodeIndex => {
        const node = topology.nodes[nodeIndex];
        return node.site_name === site.name;
      });

      nodeKeysInSite.forEach(nodeIndex => {
        const node = topology.nodes[nodeIndex];

        totalCount++;
        healthyCount += node.status == 2 || node.status == 3 ? 1 : 0;
        if (sitePolarity == null) {
          sitePolarity = node.polarity;
        }
        // mark as hybrid if anything in the site differs
        sitePolarity = node.polarity != sitePolarity ? 3 : sitePolarity;
        hasPop = node.pop_node ? true : hasPop;
        // TODO: check for mixed sites (error)
        isCn = node.node_type == 1 ? true : isCn;
        hasMac =
          node.hasOwnProperty('mac_addr') &&
          node.mac_addr &&
          node.mac_addr.length
            ? true
            : hasMac;
      });

      let siteColor = SiteOverlayKeys.Health.Unhealthy.color; // default
      let siteIndexForMarker = siteIndex;

      if (site.hasOwnProperty('pending') && site.pending) {
        siteColor = SiteOverlayKeys.Pending.Site;
      } else {
        switch (this.props.siteOverlay) {
          case 'Health':
            if (totalCount == 0) {
              siteColor = SiteOverlayKeys.Health.Empty.color;
            } else if (totalCount == healthyCount) {
              siteColor = SiteOverlayKeys.Health.Healthy.color;
            } else if (healthyCount == 0) {
              siteColor = SiteOverlayKeys.Health.Unhealthy.color;
            } else {
              siteColor = SiteOverlayKeys.Health.Partial.color;
            }
            break;
          case 'Polarity':
            siteColor = polarityColor(sitePolarity);
            break;
          default:
            siteColor = SiteOverlayKeys.Health.Unhealthy.color;
            siteIndexForMarker = undefined; // hack
        }
      }

      siteComponents.push(
        this.getSiteMarker(
          site,
          siteCoords,
          siteColor,
          hasAp,
          hasPop,
          isCn,
          hasMac,
          siteIndexForMarker,
        ),
      );
    });

    const ignitionLinks = new Set(this.props.networkConfig.ignition_state);
    // find min/max for flap events
    const linkEventCounts = [];
    topology.links.map(link => {
      if (link.link_type != 1) {
        return;
      }
      if (
        !this.nodesByName.hasOwnProperty(link.a_node_name) ||
        !this.nodesByName.hasOwnProperty(link.z_node_name)
      ) {
        return;
      }
      if (
        this.state.linkHealth.hasOwnProperty('metrics') &&
        this.state.linkHealth.metrics.hasOwnProperty(link.name)
      ) {
        // we have health data for this link
        const linkHealthEvents = this.state.linkHealth.metrics[link.name].events
          .length;
        linkEventCounts.push(linkHealthEvents);
      }
    });
    linkEventCounts.sort((a, b) => {
      return a > b ? 1 : a == b ? 0 : -1;
    });
    // use min/max/std dev or something else here (TODO)
    topology.links.map(link => {
      if (link.link_type != 1) {
        return;
      }
      if (
        !this.nodesByName.hasOwnProperty(link.a_node_name) ||
        !this.nodesByName.hasOwnProperty(link.z_node_name)
      ) {
        return;
      }
      const aNode = this.nodesByName[link.a_node_name];
      const zNode = this.nodesByName[link.z_node_name];

      const aSite = this.nodesByName[link.a_node_name].site_name;
      const zSite = this.nodesByName[link.z_node_name].site_name;
      if (
        !this.sitesByName.hasOwnProperty(aSite) ||
        !this.sitesByName.hasOwnProperty(zSite)
      ) {
        console.error('Node defined invalid site:', aSite, zSite);
        return;
      }
      const aNodeSite = this.sitesByName[aSite];
      const zNodeSite = this.sitesByName[zSite];

      if (
        !aNodeSite ||
        !zNodeSite ||
        !aNodeSite.location ||
        !zNodeSite.location
      ) {
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
          const bwUsageColor = scaleLinear()
            .domain([0, 100])
            .range(['white', '#4169e1']);
          const linkColor = rgb(
            bwUsageColor(this.state.routeWeights[link.name]),
          );
          linkLine = this.getLinkLine(link, linkCoords, linkColor);
        }
      } else {
        const overlayKey = LinkOverlayKeys[this.props.linkOverlay];
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
            if (link.hasOwnProperty('alive_perc')) {
              for (let i = 0; i < overlayKey.values.length; ++i) {
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
            if (link.hasOwnProperty('overlay_a')) {
              for (let i = 0; i < overlayKey.values.length; ++i) {
                if (link.overlay_a == overlayKey.values[i]) {
                  color_a = overlayKey.colors[i];
                  break;
                }
              }
            }
            if (link.hasOwnProperty('overlay_z')) {
              for (let i = 0; i < overlayKey.values.length; ++i) {
                if (link.overlay_z == overlayKey.values[i]) {
                  color_z = overlayKey.colors[i];
                  break;
                }
              }
            }
            linkLine = this.getLinkLineTwoSides(
              link,
              linkCoords,
              color_a,
              color_z,
            );
            break;
          case 'SNR':
          case 'MCS':
          case 'RSSI':
            let color_a = overlayKey.colors[overlayKey.values.length];
            let color_z = overlayKey.colors[overlayKey.values.length];
            if (
              this.state.linkOverlayData &&
              link.hasOwnProperty('overlay_a')
            ) {
              for (let i = 0; i < overlayKey.values.length; ++i) {
                if (link.overlay_a < overlayKey.values[i]) {
                  color_a = overlayKey.colors[i];
                  break;
                }
              }
            } else {
              color_a = 'grey';
            }
            if (
              this.state.linkOverlayData &&
              link.hasOwnProperty('overlay_z')
            ) {
              for (let i = 0; i < overlayKey.values.length; ++i) {
                if (link.overlay_z < overlayKey.values[i]) {
                  color_z = overlayKey.colors[i];
                  break;
                }
              }
            } else {
              color_z = 'grey';
            }
            linkLine = this.getLinkLineTwoSides(
              link,
              linkCoords,
              color_a,
              color_z,
            );
            break;
          case 'FLAPS':
            // flaps is a special case, can use health data to count # of events
            if (
              this.state.linkHealth.hasOwnProperty('metrics') &&
              this.state.linkHealth.metrics.hasOwnProperty(link.name)
            ) {
              // we have health data for this link
              const linkHealthEvents = this.state.linkHealth.metrics[link.name]
                .events.length;
              // linear scaling
              const healthScaleColor = scaleLinear()
                .domain([0, 5, 50])
                .range(['green', 'yellow', 'red']);
              const linkColor = rgb(healthScaleColor(linkHealthEvents));
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
      const sourceSite = this.sitesByName[this.state.routeSourceNode.site_name];
      const destSite = this.sitesByName[this.state.routeDestNode.site_name];
      siteMarkers.push(
        <CircleMarker
          center={[sourceSite.location.latitude, sourceSite.location.longitude]}
          radius={18}
          key="source_node"
          color="blue"
        />,
      );
      siteMarkers.push(
        <CircleMarker
          center={[destSite.location.latitude, destSite.location.longitude]}
          radius={18}
          key="dest_node"
          color="magenta"
        />,
      );
    }

    if (selectedSite != null) {
      const site =
        recentlyEditedSite && selectedSite == recentlyEditedSite.oldName
          ? recentlyEditedSite
          : this.sitesByName[selectedSite];

      if (site && site.location) {
        this.addNodeMarkerForSite(topology, site);
        siteMarkers = (
          <CircleMarker
            center={[site.location.latitude, site.location.longitude]}
            radius={18}
            color="rgb(30,116,255)"
          />
        );
      }
    } else if (this.state.selectedLink != null) {
      const node_a = this.nodesByName[this.state.selectedLink.a_node_name];
      const node_z = this.nodesByName[this.state.selectedLink.z_node_name];
      if (node_a && node_z) {
        const site_a = this.sitesByName[node_a.site_name];
        const site_z = this.sitesByName[node_z.site_name];
        if (site_a && site_z && site_a.location && site_z.location) {
          this.addNodeMarkerForSite(topology, site_a);

          siteMarkers = [
            <CircleMarker
              center={[site_a.location.latitude, site_a.location.longitude]}
              radius={18}
              key="a_node"
              color="rgb(30,116,255)"
            />,
          ];
          if (site_a.name != site_z.name) {
            this.addNodeMarkerForSite(topology, site_z);

            siteMarkers.push(
              <CircleMarker
                center={[site_z.location.latitude, site_z.location.longitude]}
                radius={18}
                key="z_node"
                color="rgb(30,116,255)"
              />,
            );
          }
        }
      }
    }

    let layersControl = (
      <Control position="topright">
        <img
          src="/static/images/layers.png"
          onClick={() => {
            this.disableMapScrolling();
            this.setState({detailsExpanded: true});
          }}
        />
      </Control>
    );
    let showOverview = false;
    let topologyIssuesControl;

    const maxModalHeight = this.state.upperPaneHeight - 120; // offset
    if (this.state.detailsExpanded) {
      if (this.state.selectedLink) {
        layersControl = (
          <Control position="topright">
            <DetailsLink
              topologyName={this.props.networkConfig.topology.name}
              link={this.state.selectedLink}
              nodes={this.nodesByName}
              maxHeight={maxModalHeight}
              onClose={this.closeModal}
              onEnter={this.disableMapScrolling}
              onLeave={this.enableMapScrolling}
            />
          </Control>
        );
      } else if (this.state.selectedNode) {
        const node = this.nodesByName[this.state.selectedNode];
        layersControl = (
          <Control position="topright">
            <DetailsNode
              topologyName={this.props.networkConfig.topology.name}
              node={node}
              links={this.linksByName}
              maxHeight={maxModalHeight}
              onClose={this.closeModal}
              onEnter={this.disableMapScrolling}
              onLeave={this.enableMapScrolling}
            />
          </Control>
        );
      } else if (this.state.selectedSite) {
        const site = this.sitesByName[this.state.selectedSite];
        // determine color to use per link connected to the site
        // first get nodes connected to the site
        // second get links connected to the nodes
        layersControl = (
          <Control position="topright">
            <DetailsSite
              topologyName={this.props.networkConfig.topology.name}
              site={site}
              nodes={this.nodesByName}
              links={this.linksByName}
              maxHeight={maxModalHeight}
              onClose={this.closeModal}
              onEnter={this.disableMapScrolling}
              onLeave={this.enableMapScrolling}
            />
          </Control>
        );
      } else {
        showOverview = true;
      }
    }
    if (showOverview) {
      // overview
      layersControl = (
        <Control position="topright">
          <DetailsTopology
            topologyName={this.props.networkConfig.topology.name}
            topology={this.props.networkConfig.topology}
            nodes={this.nodesByName}
            links={this.linksByName}
            maxHeight={maxModalHeight}
            onClose={this.closeModal}
            onEnter={this.disableMapScrolling}
            onLeave={this.enableMapScrolling}
          />
        </Control>
      );
    }
    if (this.state.showTopologyIssuesPane) {
      topologyIssuesControl = (
        <Control position="topleft">
          <DetailsTopologyIssues
            topology={this.props.networkConfig.topology}
            maxHeight={maxModalHeight}
            newTopology={this.state.newTopology}
          />
        </Control>
      );
    }

    const tablesControl = (
      <Control position="bottomright">
        <img
          style={{backgroundColor: 'rgba(245, 245, 245, 0.8)'}}
          src={
            this.state.tablesExpanded
              ? '/static/images/table.png'
              : '/static/images/table-accent.png'
          }
          onClick={this.handleExpandTablesClick}
        />
      </Control>
    );

    let tileUrl = '/map/tile/{s}/{z}/{x}/{y}.png';
    if (!window.CONFIG.use_tile_proxy) {
      tileUrl = window.location.protocol + MapTiles[this.props.mapTile];
    }

    let plannedSite = null;
    if (this.state.plannedSite) {
      plannedSite = (
        <Marker
          icon={SITE_MARKER}
          draggable
          onDragend={this.updatePlannedPosition}
          position={[
            this.state.plannedSite.location.latitude,
            this.state.plannedSite.location.longitude,
          ]}
          ref={this.plannedSiteMarkerRef}
          radius={20}
        />
      );
      layersControl = (
        <Control position="topright">
          <DetailsCreateOrEditSite
            editing={false}
            site={this.state.plannedSite}
            maxHeight={maxModalHeight}
            onClose={() => {
              this.enableMapScrolling();
              this.setState({plannedSite: null});
            }}
            onMouseEnter={this.disableMapScrolling}
            onMouseLeave={this.enableMapScrolling}
            onSaveSite={this.commitPlannedSite}
            onSiteUpdate={this.updatePlannedSite}
          />
        </Control>
      );
    }

    let editSiteMarker = null;
    if (siteToEdit) {
      editSiteMarker = (
        <Marker
          icon={SITE_MARKER}
          draggable
          onDragend={this.updateSiteToEditPosition}
          position={[
            siteToEdit.location.latitude,
            siteToEdit.location.longitude,
          ]}
          ref={this.siteToEditRef}
          radius={20}
        />
      );
      layersControl = (
        <Control position="topright">
          <DetailsCreateOrEditSite
            editing
            site={this.state.siteToEdit}
            maxHeight={maxModalHeight}
            onClose={() => {
              this.enableMapScrolling();
              this.setState({siteToEdit: null});
            }}
            onMouseEnter={this.disableMapScrolling}
            onMouseLeave={this.enableMapScrolling}
            onSaveSite={this.editSite}
            onSiteUpdate={this.updateSiteToEdit}
          />
        </Control>
      );
    }

    if (this.state.hoveredSite) {
      this.addNodeMarkerForSite(topology, this.state.hoveredSite);
    }

    const legendControl = (
      <Control position="bottomleft">
        <DetailsLegend
          siteOverlay={this.props.siteOverlay}
          linkOverlay={this.props.linkOverlay}
        />
      </Control>
    );

    return (
      <div>
        <SplitPane
          split="horizontal"
          ref={this.splitPaneRef}
          defaultSize="50%"
          className={this.state.tablesExpanded ? null : 'soloPane1'}
          onChange={this.paneChange}>
          <CustomMap
            ref={this.mapRef}
            onZoom={this.onMapZoom}
            center={centerPosition}
            zoom={this.state.zoomLevel}>
            <TileLayer
              url={tileUrl}
              attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
            />
            {linkComponents}
            {siteComponents}
            {siteMarkers}

            {legendControl}
            {layersControl}
            {tablesControl}
            {topologyIssuesControl}
            {plannedSite}
            {editSiteMarker}
            <LayerGroup ref={this.nodesRef} />
          </CustomMap>
          <NetworkDataTable
            height={this.state.lowerPaneHeight}
            networkConfig={this.props.networkConfig}
            viewLinkDashboard={this.props.viewLinkDashboard}
          />
        </SplitPane>
      </div>
    );
  }
}
