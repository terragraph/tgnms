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
import MapView, { Polygon, Marker, Polyline } from 'react-native-maps';
// component cards
import LinkCard from './components/LinkCard';
import NodeCard from './components/NodeCard';
import OverviewCard from './components/OverviewCard';
import SiteCard from './components/SiteCard';
// qr/barcode scanner
import QRCodeScanner from 'react-native-qrcode-scanner';
import { nodeTypeStr } from './TopologyHelper';
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
const Green = '#3c763d';
const Orange = '#ca6406';
const Red = '#961917';
const White = '#FFFFFF';
const Blue = '#0000FF';
const LatUnit = 0.00005;
const LngUnit = 0.00005;

export default class App extends Component<Props> {
  state = {
    topology: {},
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
    latitude: 37.3330428,
    longitude: -121.8921609,
    // show details of a site/node/link
    selectedSite: null,
    selectedNode: null,

    // selectedNodes: [],
    showCard: null,
  };

  constructor(props) {
    super(props);

    this.refreshTopology();
    this.refreshStatusDump();
    // refresh topology frequently
    setInterval(() => {
      this.refreshTopology();
      this.refreshStatusDump();
    }, 10000);
  }

  componentDidMount() {
    navigator.geolocation.getCurrentPosition(
       (position) => {
         this.setState({
           currPos: position.coords,
           //latitude: position.coords.latitude,
           //longitude: position.coords.longitude,
         });
       },
       (error) => this.setState({
         currPos: undefined
       }),
       { enableHighAccuracy: true, timeout: 200000, maximumAge: 1000 },
     );
  }

  refreshTopology() {
    // fetch topology for SJC w/ basic auth from api service
    fetch('https://bastion-sjc.cxl-terragraph.com/api/getTopology', {
        headers: {
          Authorization: 'Basic dGdubXM6RmFjZWJvb2tAMTIz'
        },
        method: 'post',
        body: '{}',
      })
    .then((response) => response.json())
    .then((responseJson) => {
      if (responseJson) {
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
        responseJson.nodes.forEach(node => {
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
        responseJson.sites.forEach(site => {
          siteLocations[site.name] = site.location;
        });
        responseJson.links.forEach(link => {
          if (link.link_type == 2) {
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
          topology: responseJson,
          nodeToSite: nodeToSite,
          nodesBySite: nodesBySite,
          siteLocations: siteLocations,
          siteOnline: siteOnline,
          siteOffline: siteOffline,
          nodesOnline: nodesOnline,
          nodesOffline: nodesOffline,
          linksOnline: linksOnline,
          linksOffline: linksOffline
        });

      }
    })
    .catch((error) => {});
  }

  refreshStatusDump() {
    // fetch status dump for ips, versions, etc
    fetch('https://bastion-sjc.cxl-terragraph.com/api/getCtrlStatusDump', {
        headers: {
          Authorization: 'Basic dGdubXM6RmFjZWJvb2tAMTIz'
        },
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

  getNodeShape(siteLocation, hasCn) {
    // north-south
    let lat = siteLocation.latitude;
    // east-west
    let lng = siteLocation.longitude;
    if (!hasCn) {
      // hexagon
      return [
        {latitude: lat, longitude: lng - LngUnit * 2},
        {latitude: lat + LatUnit * 2, longitude: lng - LngUnit},
        {latitude: lat + LatUnit * 2, longitude: lng + LngUnit},
        {latitude: lat, longitude: lng + LngUnit * 2},
        {latitude: lat - LatUnit * 2, longitude: lng + LngUnit},
        {latitude: lat - LatUnit * 2, longitude: lng - LngUnit}
      ];
    } else if (hasCn) {
      // triangle
      return [
        {latitude: lat + LatUnit * 2, longitude: lng},
        {latitude: lat - LatUnit * 2, longitude: lng + LngUnit * 2},
        {latitude: lat - LatUnit * 2, longitude: lng - LngUnit * 2}
      ];
    }
  }

  mapPressed(event) {
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
          closeFunction={() => this.setState({showCard: null})}
          selectNodeFunction={(node) => this.setState({showCard: 'node', selectedNode: node})}
          site={this.state.selectedSite}
          topology={this.state.topology}
          nodes={this.state.nodesBySite[this.state.selectedSite.name]}
          linksByNode={this.state.linksByNode}
        />
      );
    } else if (this.state.showCard == 'node') {
      return (
        <NodeCard
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
          link={this.state.selectedLink}
          sites={this.state.topology.sites}
          nodes={this.state.topology.nodes}
          backFunction={() => this.setState({showCard: 'node'})}
          closeFunction={() => this.setState({showCard: null})}
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
    markers.push(
      <Polygon
        coordinates={this.getNodeShape(site.location, hasCn)}
        strokeWidth={1}
        strokeColor={siteStatusColor}
        fillColor={hasPop ? Blue : siteStatusColor}
        key={site.name}
        title={site.name}
        tappable={true}
        onPress={(event) => {
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
      currentLocationCard =
        <View style={styles.bubbleTopRight}>
          <TouchableHighlight onPress={() => {
              // select current location
              Alert.alert(
                'Using current position',
                'Coordinates: ' + this.state.currPos == undefined ? 'undef' :
                  (this.state.currPos.latitude + ' / ' + this.state.currPos.longitude),
                [
                  {text: 'Pin', onPress: () => console.log('Ask me later pressed')},
                  {text: 'Updating', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
                  {text: 'Cancel', onPress: () => console.log('OK Pressed')},
                ],
                { cancelable: true }
              );
            }}>
            <Text>(Cur Loc)</Text>
          </TouchableHighlight>
        </View>;
    }
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
              <TouchableHighlight onPress={() => this.setState({showCamera: false})}>
                <Text style={{fontSize: 22, fontWeight: 'bold', marginTop: -15}}>
                  Close
                </Text>
              </TouchableHighlight>
            </View>
          }
          //cameraStyle={styles.cameraContainer}
          cameraStyle={{height: Dimensions.get('window').height - 40}}
          containerStyle={{top: 40}}
          //containerStyle={{marginTop: 0, height: Dimensions.get('window').height}}
        />
      );
    }
    return (
      <View style={styles.container}>
        <MapView
          style={styles.map}
          region={{
            latitude: this.state.latitude,
            longitude: this.state.longitude,
            // north-south
            latitudeDelta: 0.01,
            // east-west
            longitudeDelta: 0.005

          }}
          onRegionChange={(region) => {
            this.setState({
              latitude: region.latitude,
              longitude: region.longitude,
            });
          }}
          //onPress={this.mapPressed.bind(this)}
          >
          {links}
          {markers}
        </MapView>
        {overviewCard}
        {currentLocationCard}
        {this.showCard()}
      </View>
    );
  }
}
