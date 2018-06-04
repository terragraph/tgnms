/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  SectionList,
  StyleSheet,
  Text,
  TouchableHighlight,
  View
} from 'react-native';
import Svg from 'react-native-svg';
import MapView, { Polygon, Marker, Polyline } from 'react-native-maps';
// component cards
import LinkCard from './components/LinkCard';
import NodeCard from './components/NodeCard';
import OverviewCard from './components/OverviewCard';
import SiteCard from './components/SiteCard';
//import SvgLocationIcon from './components/SvgLocationIcon';
// qr/barcode scanner
import QRCodeScanner from 'react-native-qrcode-scanner';
import { nodeTypeStr } from './TopologyHelper';
import { offlineTopology } from './OfflineNetworks';
// yellow boxes complaining about dependencies that use 'deprecated' features
import { YellowBox } from 'react-native';
import { styles } from './styles';

YellowBox.ignoreWarnings([
  'Warning: componentWillMount is deprecated',
  'Warning: componentWillReceiveProps is deprecated',
  'Warning: componentWillUpdate is deprecated',
  'Module RCTImageLoader requires main queue',
  'Class RCTCxxModule was not exported',
  'RCTBridge required dispatch_sync'
]);

type Props = {};
// fake topology
const OFFLINE_MODE = false;
const Green = '#3c763d';
const Orange = '#ca6406';
const Red = '#961917';
const White = '#FFFFFF';
const Blue = '#0000FF';
const LatUnit = 0.00005;
const LngUnit = 0.00005;

// On start-up fetch the topology for each
// TODO: make this a QR code w/ auth token
const NetworkList = [
    {apiUrl: "https://bastion-sjc.cxl-terragraph.com/api",
     authHeaders: "Authorization: 'Basic dGdubXM6RmFjZWJvb2tAMTIz'"},
     /* a reverse proxy from "Lab F8 B" -> AWS, then nginx on the same host forwards the HTTPS request into the forwarded HTTP port */
    {apiUrl: "https://bastion-sjc.cxl-terragraph.com/lab_alignment",
     queryServiceUrl: "https://bastion-sjc.cxl-terragraph.com/lab_alignment_qs",
     authHeaders: {Authorization: 'Basic dGdubXM6RmFjZWJvb2tAMTIz'}},
   {apiUrl: "https://tgnms.dev.telekom.hu/api",
      queryServiceUrl: "https://tgnms.dev.telekom.hu/query_service",
      authHeaders: {Authorization: 'Basic dGdubXM6RmFjZWJvb2tAMTIz'}},
];
const Network = NetworkList[2];

export default class App extends Component<Props> {
  state = {
    topology: {},

    errorMsg: undefined,
    // topology mappings
    nodesToSite: {},
    nodesBySite: {},
    linksByNode: {},
    siteLocations: {},
    siteOnline: {},
    siteOffline: {},
    nodesOnline: 0,
    nodesOffline: 0,
    linksOnline: 0,
    linksOffline: 0,

    statusDump: {},
    showCamera: false,
    cameraCallbackFunc: undefined,
    // current gps location
    currPos: undefined,
    useCurrentPos: false,
    // sjc initial coords
    latitude: undefined,
    longitude: undefined,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
    // show details of a site/node/link
    selectedSite: null,
    selectedNode: null,
    selectedLink: null,
    // selectedNodes: [],
    showCard: null,
  };

  constructor(props) {
    super(props);
  }

  dimensionsHandler(dim) {
    this.forceUpdate();
  }

  componentDidMount() {
    if (OFFLINE_MODE) {
      // if in offline mode, add fake load time
      setTimeout(() => {
        this.refreshTopology();
        this.refreshStatusDump();
        }, 2000,
      );
    } else {
      this.refreshTopology();
      this.refreshStatusDump();
    }
    // refresh topology frequently
    setInterval(() => {
      this.refreshTopology();
      this.refreshStatusDump();
    }, 10000);

    Dimensions.addEventListener("change", this.dimensionsHandler.bind(this));
    this.watchId = navigator.geolocation.watchPosition(
       (position) => {
         //if (this.state.useCurrentPos) {}
           this.setState({
             currPos: position.coords,
             //latitude: position.coords.latitude,
             //longitude: position.coords.longitude,
           });
           //Alert.alert('got location', JSON.stringify(position.coords));
         //}
       },
       (error) => this.setState({
         currPos: undefined,
       }),
       { enableHighAccuracy: true,
         timeout: 20000,
         maximumAge: 1000,
         distanceFilter: 10 },

     );
  }

  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchId);
  }

  refreshTopology() {
    if (OFFLINE_MODE) {
      this.parseTopology(offlineTopology());
      return;
    }
    // fetch topology for SJC w/ basic auth from api service
    fetch(Network.apiUrl + '/getTopology', {
        headers: Network.authHeaders,
        method: 'post',
        body: '{}',
      })
    .then((response) => response.json())
    .then((responseJson) => {
      if (responseJson) {
        this.parseTopology(responseJson);
      }
    })
    .catch((error) => {
      // unable to load topology
      this.setState({
        errorMsg: "Unable to load topology: " + error,
      });
    });
  }

  parseTopology(topology) {
    // overall status metrics
    let nodesOnline = 0;
    let nodesOffline = 0;
    let linksOnline = 0;
    let linksOffline = 0;
    // node + site mappings
    let nodeToSite = {};
    let nodesBySite = {};
    let linksByNode = {};
    let siteOnline = {};
    let siteOffline = {};
    topology.sites = topology.sites.map(site => {
      let siteLat = site.location.latitude;
      let siteLng = site.location.longitude;
      /*if (site.name == 'RF1') {
        siteLat = 37.484946;
        siteLng = -122.1475237;
      } else if (site.name == 'RF2') {
        siteLat = 37.484746;
        siteLng = -122.1469237;
      }*/
      return {
        name: site.name,
        location: {
          latitude: siteLat,
          longitude: siteLng,
          altitude: site.location.altitude
        }
      };
    });
    topology.nodes.forEach(node => {
      nodeToSite[node.name] = node.site_name;
      if (!siteOnline.hasOwnProperty(node.site_name)) {
        siteOnline[node.site_name] = 0;
      }
      if (!siteOffline.hasOwnProperty(node.site_name)) {
        siteOffline[node.site_name] = 0;
      }
      // index nodes by site
      if (!nodesBySite.hasOwnProperty(node.site_name)) {
        nodesBySite[node.site_name] = [];
      }
      nodesBySite[node.site_name].push(node);
      // track status of nodes
      if (node.status >= 2) {
        siteOnline[node.site_name]++;
        nodesOnline++;
      } else {
        siteOffline[node.site_name]++;
        nodesOffline++;
      }
    });
    let siteLocations = {};
    // compute the initial region
    let minLat = topology.sites[0].location.latitude;
    let maxLat = topology.sites[0].location.latitude;
    let minLng = topology.sites[0].location.longitude;
    let maxLng = topology.sites[0].location.longitude;
    topology.sites.forEach(site => {
      minLat = Math.min(minLat, site.location.latitude);
      maxLat = Math.max(maxLat, site.location.latitude);
      minLng = Math.min(minLng, site.location.longitude);
      maxLng = Math.max(maxLng, site.location.longitude);
      siteLocations[site.name] = site.location;
    });
    topology.links.forEach(link => {
      if (link.link_type == 2) {
        // skip ethernet links
        return;
      }
      if (link.is_alive) {
        linksOnline++;
      } else {
        linksOffline++;
      }
      if (!linksByNode.hasOwnProperty(link.a_node_name)) {
        linksByNode[link.a_node_name] = [];
      }
      if (!linksByNode.hasOwnProperty(link.z_node_name)) {
        linksByNode[link.z_node_name] = [];
      }
      linksByNode[link.a_node_name].push(link);
      linksByNode[link.z_node_name].push(link);
      let siteA = siteLocations[nodeToSite[link.a_node_name]];
      let siteZ = siteLocations[nodeToSite[link.z_node_name]];
    });
    this.setState({
      latitude: (maxLat + minLat) / 2,
      longitude: (maxLng + minLng) / 2,
      latitudeDelta: (maxLat - minLat),
      longitudeDelta: (maxLng - minLng),
      topology: topology,
      errorMsg: undefined,
      nodeToSite: nodeToSite,
      nodesBySite: nodesBySite,
      siteLocations: siteLocations,
      linksByNode: linksByNode,
      siteOnline: siteOnline,
      siteOffline: siteOffline,
      nodesOnline: nodesOnline,
      nodesOffline: nodesOffline,
      linksOnline: linksOnline,
      linksOffline: linksOffline
    });
    // select first link
    /*topology.links.forEach(link => {
      if (link.name == 'link-RF1.p1-RF2.p1') {
        this.setState({
          showCard: 'link',
          selectedLink: link,
        });
      }
    });*/
    // select a site for testing
    /*topology.sites.forEach(site => {
      if (site.name == '12L418') {
        this.setState({showCard: 'site', selectedSite: site});
      }
    });*/

  }
  refreshStatusDump() {
    // fetch status dump for ips, versions, etc
    fetch(Network.apiUrl + '/getCtrlStatusDump', {
        headers: Network.authHeaders,
        method: 'post',
        body: '{}',
      })
    .then((response) => response.json())
    .then((responseJson) => {
      if (responseJson) {
        this.setState({
          statusDump: responseJson,
        });
      }
    })
    .catch((error) => {});
  }

  getNodeShape(siteLocation, hasCn, latUnit, lngUnit) {
    // north-south
    let lat = siteLocation.latitude;
    // east-west
    let lng = siteLocation.longitude;
    if (!hasCn) {
      // hexagon
      return [
        {latitude: lat, longitude: lng - lngUnit * 2},
        {latitude: lat + latUnit * 2, longitude: lng - lngUnit},
        {latitude: lat + latUnit * 2, longitude: lng + lngUnit},
        {latitude: lat, longitude: lng + lngUnit * 2},
        {latitude: lat - latUnit * 2, longitude: lng + lngUnit},
        {latitude: lat - latUnit * 2, longitude: lng - lngUnit}
      ];
    } else if (hasCn) {
      // triangle
      return [
        {latitude: lat + latUnit * 2, longitude: lng},
        {latitude: lat - latUnit * 2, longitude: lng + lngUnit * 2},
        {latitude: lat - latUnit * 2, longitude: lng - lngUnit * 2}
      ];
    }
  }

  mapPressed(event) {
    //Alert.alert('Pressed', 'Lat: ' + event.nativeEvent.coordinate.latitude + ' - Lng: ' + event.nativeEvent.coordinate.longitude);
/*    this.setState({
      bottomMsg: 'We were pressed at ' + event.nativeEvent.coordinate.latitude + ' / ' +
        event.nativeEvent.coordinate.longitude,
    });*/
  }

  showCard() {
    if (!this.state.showCard) {
      return;
    } else if (this.state.showCard == 'site') {
      return (
        <SiteCard
          network={Network}
          closeFunction={() => this.setState({showCard: null})}
          selectNodeFunction={(node) => this.setState({showCard: 'node', selectedNode: node})}
          site={this.state.selectedSite}
          node={this.state.selectedNode}
          highlightNodeFunction={(node) => {
            this.setState({
              selectedNode: node,
            })
          }}
          topology={this.state.topology}
          nodes={this.state.nodesBySite.hasOwnProperty(this.state.selectedSite.name) ?
                 this.state.nodesBySite[this.state.selectedSite.name] : []}
          linksByNode={this.state.linksByNode}
          siteLocations={this.state.siteLocations}
          nodeToSite={this.state.nodeToSite}
        />
      );
    } else if (this.state.showCard == 'node') {
      return (
        <NodeCard
          network={Network}
          node={this.state.selectedNode}
          statusDump={this.state.statusDump}
          topology={this.state.topology}
          backFunction={() => this.setState({showCard: 'site'})}
          closeFunction={() => this.setState({showCard: null})}
          selectLinkFunction={(link) => this.setState({showCard: 'link', selectedLink: link})}
          showCameraFunction={(func) => this.setState({showCamera: true, cameraCallbackFunc: func})}
        />
      );
    } else if (this.state.showCard == 'link') {
      return (
        <LinkCard
          network={Network}
          link={this.state.selectedLink}
          sites={this.state.topology.sites}
          nodes={this.state.topology.nodes}
          topology={this.state.topology}
          backFunction={() => this.setState({showCard: 'node'})}
          closeFunction={() => this.setState({showCard: null})}
          //statsFunction={() => this.setState({showStats: })}
        />);
    }
  }

  getSiteMarkers(markers, site, nodes, nodesOnline, nodesOffline) {
    // draw site marker based on status of site/nodes
    // add icons for POP node, DN/CN, WAP, and selected
    let hasCn = false;
    let hasPop = false;
    if (nodes) {
      nodes.forEach(node => {
        hasPop = node.pop_node ? true : hasPop;
        hasCn = node.node_type == 1 ? true : hasCn;
      });
    }
    let isSelected = (this.state.selectedSite != null &&
                      this.state.selectedSite.name == site.name) ? true : false;
    // status color
    let siteStatusColor = Orange;
    if (nodesOnline > 0 && nodesOffline == 0) {
      siteStatusColor = Green;
    } else if (nodesOffline > 0 && nodesOnline == 0) {
      siteStatusColor = Red;
    } else if (nodesOffline == 0 && nodesOnline == 0) {
      siteStatusColor = White;
    }
    // WAP = X?
    // TODO - poll ruckus endpoint or wait until data is merged

    // selected = ?
    let polygonCoords = this.getNodeShape(site.location, hasCn, LatUnit, LngUnit);
    // if a link is selected, check if the site is on one side of the link to enlarge it
    if (this.state.selectedLink &&
        this.state.selectedLink.name) {
      // enlarge sites associated with link to make it easier to click
      let siteA = this.state.nodeToSite[this.state.selectedLink.a_node_name];
      let siteZ = this.state.nodeToSite[this.state.selectedLink.z_node_name];
      if (site.name == siteA || site.name == siteZ) {
        // Alert.alert('siteA', siteA);
        polygonCoords = this.getNodeShape(site.location, hasCn, LatUnit * 3, LngUnit * 3);
      }
    }
    markers.push(
      <Polygon
        coordinates={polygonCoords}
        strokeWidth={3}
        strokeColor={isSelected ? Orange : siteStatusColor}
        fillColor={hasPop ? Blue : siteStatusColor}
        key={site.name}
        title={site.name}
        tappable={true}
        onPress={(event) => {
          //Alert.alert('we wuz pressed', 'press me');
          this.setState({
            selectedSite: site,
            //selectedNodes: nodes,
            showCard: 'site',
          });
        }}
      />
    );
  }

  render() {
    // initial coordinates
    let markers = [];
    let links = [];
    let overviewCard;
    let currentLocationCard;
    if (this.state.topology.sites) {
      this.state.topology.sites.forEach(site => {
        let nodesOnline = this.state.siteOnline.hasOwnProperty(site.name) ? this.state.siteOnline[site.name] : 0;
        let nodesOffline = this.state.siteOffline.hasOwnProperty(site.name) ? this.state.siteOffline[site.name] : 0;
        this.getSiteMarkers(markers, site, this.state.nodesBySite[site.name], nodesOnline, nodesOffline);
      });
      this.state.topology.links.forEach(link => {
        if (link.link_type == 2) {
          return;
        }
        let siteA = this.state.siteLocations[this.state.nodeToSite[link.a_node_name]];
        let siteZ = this.state.siteLocations[this.state.nodeToSite[link.z_node_name]];
        links.push(
          <Polyline
            coordinates={[
              {latitude: siteA.latitude, longitude: siteA.longitude},
              {latitude: siteZ.latitude, longitude: siteZ.longitude}
            ]}
            strokeWidth={3}
            strokeColor={link.is_alive ? Green : Red}
            key={link.name}
            onPress={(loc) => {
              this.setState({
                selectedLink: link,
              });
            }}
          />
        );
      });
      overviewCard =
        <OverviewCard
          topology={this.state.topology}
          nodesOnline={this.state.nodesOnline}
          nodesOffline={this.state.nodesOffline}
          linksOnline={this.state.linksOnline}
          linksOffline={this.state.linksOffline}
        />;
      let hasPositionColor = this.state.currPos == undefined ?
        "rgba(142, 142, 142, 0.8)" :
        "rgba(140, 200, 130, 0.8)";
      currentLocationCard =
        <View style={StyleSheet.flatten([styles.bubbleTopRight, {backgroundColor: hasPositionColor}])}>
          <TouchableHighlight onPress={() => {
              // select current location
              Alert.alert(
                'Re-position map to current location?',
                'Coordinates: ' + (this.state.currPos == undefined ? 'N/A' :
                  (this.state.currPos.latitude + ' / ' + this.state.currPos.longitude)),
                [
                  {text: 'Yes, Once', onPress: () => {
                    this.setState({
                      latitude: this.state.currPos.latitude,
                      longitude: this.state.currPos.longitude,
                    });
                  }},
                  //{text: 'Updating', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
                  {text: 'Cancel', onPress: () => console.log('OK Pressed')},
                ],
                { cancelable: true }
              );
            }}>

          </TouchableHighlight>
        </View>;
    }
    /*<Text>GPS {this.state.currPos != undefined ? "Active" : "Offline"}</Text>*/
    /*
    <TouchableHighlight onPress={() => this.setState({useCurrentPos: !this.state.useCurrentPos})}>
      <SvgLocationIcon useCurrentPos={this.state.useCurrentPos} />
    </TouchableHighlight>
    */
    if (this.state.showCamera) {
      return (
        <QRCodeScanner
          onRead={(e) => {
            // send data back to requestor
            if (this.state.cameraCallbackFunc != undefined) {
              this.state.cameraCallbackFunc(e);
            }
            this.setState({showCamera: false});
          }}
          topContent={
            <View>
              <TouchableHighlight onPress={() => this.setState({showCamera: false})}
                style={{marginTop: 0, height: 40}}>
                <Text style={{fontSize: 22, fontWeight: 'bold', marginTop: 0}}>
                  Close
                </Text>
              </TouchableHighlight>
            </View>
          }
          //cameraStyle={styles.cameraContainer}
          cameraStyle={{height: Dimensions.get('window').height - 50}}
          containerStyle={{top: 50}}
          //containerStyle={{marginTop: 0, height: Dimensions.get('window').height}}
        />
      );
    }
    // android totally hates region={}, switched to initialRegion
    /*          onRegionChange={(region) => {
                this.setState({
                  latitude: region.latitude,
                  longitude: region.longitude,
                  latitudeDelta: region.latitudeDelta,
                  longitudeDelta: region.longitudeDelta,
                });
              }}*/
    if (this.state.errorMsg != undefined) {
      return (
        <View style={styles.container}>
          <Text style={{fontSize: 24, color: 'rgb(255, 0, 0)'}}>{this.state.errorMsg}</Text>
        </View>
      );
    } else if (!this.state.latitude && !this.state.longitude) {
      // TODO: loading spinner, or enter/scan topology code
      return (
        <View style={styles.container}>
          <Text style={{fontSize: 24}}>Waiting for initial topology..</Text>
        </View>
      );
    } else {
      //          {currentLocationCard}
      return (
        <View style={styles.container}>
          <MapView
            ref={map => { this._map = map }}
            showsUserLocation={true}
            style={styles.map}
            initialRegion={{
              latitude: this.state.latitude,
              longitude: this.state.longitude,
              // north-south
              latitudeDelta: this.state.latitudeDelta + 0.002,
              // east-west
              longitudeDelta: this.state.longitudeDelta + 0.002,
            }}

            onPress={this.mapPressed.bind(this)}
            rotateEnabled={false}
            >
            {markers}
            {links}
          </MapView>
          {overviewCard}
          {this.showCard()}
        </View>
      );
    }
  }
}
