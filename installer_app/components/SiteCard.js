
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Button,
  Dimensions,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableHighlight,
  View
} from 'react-native';
import Svg, { Circle, Polygon, Text as SvgText, TextPath } from 'react-native-svg';
import { styles } from '../styles';
import { circleCoordinates, linkAngle, nodeTypeStr } from '../TopologyHelper';
import * as ttypes from '../TopologyTypes';

type Props = {
  network: Object,
  closeFunction: () => void,
  selectNodeFunction: (node: Object) => void,
  site: Object,
  node: Object,
  highlightNodeFunction: (node: Object) => void,
  nodes: Array<ttypes.Node>,
  linksByNode: { [string]: Array<ttypes.Link> },
  siteLocations: { [string]: ttypes.Location},
  nodeToSite: { [string]: string },
  topology: ttypes.Topology,
};
type State = {
  showOrientation: boolean,
};

export default class SiteCard extends Component<Props, State> {
  state = {
    showOrientation: true,
  };

  drawSectorOrientation() {
    // use the smallest of (width, height, idealSize)
    let idealSize = Math.min(
      Dimensions.get('window').width - 40,
      Dimensions.get('window').height - 40,
      200
    )
    let circleRadius = idealSize / 2 - 4;
    let cx = idealSize / 2 + 2;
    // draw triangles to represent sector orientation
    let sectorPolygons = [];
    this.props.nodes.forEach(node => {
      // check for links assigned to the node
      let angle = 0;
      if (this.props.linksByNode.hasOwnProperty(node.name)) {
        let links = this.props.linksByNode[node.name];
        // PTP links are straight-forward, just show the angle of the link
        if (links.length != 1) {
          return;
        }
        let aSite = this.props.nodeToSite[links[0].a_node_name];
        let zSite = this.props.nodeToSite[links[0].z_node_name];
        if (aSite == node.site_name) {
          angle = linkAngle(this.props.siteLocations[aSite], this.props.siteLocations[zSite]);
        } else {
          angle = linkAngle(this.props.siteLocations[zSite], this.props.siteLocations[aSite]);
        }
        let anglePoints = [
          circleCoordinates(15, idealSize, angle + 10),
          circleCoordinates(15, idealSize, angle - 10),
          circleCoordinates(idealSize, idealSize, angle - 10),
          circleCoordinates(idealSize, idealSize, angle + 10)
        ];
        sectorPolygons.push(
          <Polygon
            key={"sector-coords" + node.name}
            points={anglePoints.join(" ")}
            id={node.name}
            fill="rgba(50, 150, 255, 0.8)"
            stroke="black"
            title={node.name}
            strokeWidth={
              (this.props.node && this.props.node.name == node.name) ? 3 : 1
            }
            onPress={() => {
              // select a node in the parents state
              if (this.props.node &&
                  this.props.node.name == node.name) {
                this.props.selectNodeFunction(node);
              } else {
                this.props.highlightNodeFunction(node);
              }
            }}
          />
        );
      }
    });
/*          <Circle cx={cx} cy={cx} r={circleRadius} strokeWidth="1" stroke="black" fillOpacity="0" />
          <Circle cx={cx} cy={cx} r={10} strokeWidth="1" stroke="black" fillOpacity="0" />*/
    return (
      <View style={{alignSelf: "center"}}>
        <Svg height={idealSize} width={idealSize}>
          {sectorPolygons}
        </Svg>
      </View>
    );
  }

  render() {
    const site = this.props.site;
    let nodeList = this.props.topology.nodes.filter(node => {
      return node.site_name == site.name;
    });
    if (nodeList.length == 0) {
      return (
        <View style={StyleSheet.flatten([styles.bubbleBottom, {width: Dimensions.get('window').width - 20}])}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitle}>
              {this.props.site.name}
            </Text>
            <TouchableHighlight key="close" style={styles.closeBox} onPress={this.props.closeFunction}>
              <Text selectable={false} style={styles.bigBox}>X</Text>
            </TouchableHighlight>
          </View>
          <View style={styles.detailRows}>
            <Text style={{fontSize: 24, textAlign: 'center', flex: 1}}>No Nodes Defined</Text>
          </View>
        </View>
      );
    }
    let hasPop = nodeList.filter(node => node.pop_node).length > 0;
    let nodeListSet = new Set(this.props.nodes);
    // add link angle for all wireless links
    let links = [];
    this.props.nodes.forEach(node => {
      if (this.props.linksByNode.hasOwnProperty(node.name)) {
        this.props.linksByNode[node.name].forEach(link => {links.push(link)});
      }
    });
    let siteDetails =
      <SectionList
        sections={[
            {title: site.name, data: nodeList}
        ]}
        renderSectionHeader={({section, index}) => {
          return [
            <View key="titleAndClose" style={[styles.sectionHeader]}>
              <Text key="title" style={styles.sectionHeaderTitle}>
                {section.title}{hasPop ? " (POP)" : ""}
              </Text>
              <TouchableHighlight key="close" style={styles.closeBox} onPress={this.props.closeFunction}>
                <Text selectable={false} style={styles.bigBox}>X</Text>
              </TouchableHighlight>
            </View>,
            <View key="header" style={[styles.columns, styles.headerRow]}>
              <Text style={{flex: 2}}>
                Name
              </Text>
              <Text style={{flex: 3}}>
                MAC
              </Text>
              <Text style={{flex: 2}}>
                Type
              </Text>
            </View>,
          ];
        }}
        renderItem={({item}) => {
          let style = styles.columns;
          if (this.props.node &&
              item.name == this.props.node.name) {
            style = StyleSheet.flatten(
              [styles.columns, {backgroundColor: 'rgba(50, 150, 255, 0.5)',}]
            );
          }
          return (
            <TouchableHighlight onPress={() => {
              if (this.props.node && this.props.node.name == item.name) {
                this.props.selectNodeFunction(item);
              } else {
                this.props.highlightNodeFunction(item);
              }
            }}>
              <View style={style}>
                <Text style={{flex: 2}}>
                  {item.name}
                </Text>
                <Text style={{flex: 3}}>
                  {item.mac_addr.length == 0 ? '<Not Defined>' : item.mac_addr}
                </Text>
                <Text style={{flex: 1}}>
                  {nodeTypeStr(item.node_type)}
                </Text>
                <Text style={{flex: 1}}>
                  {item.is_primary ? "P" : "S"}
                </Text>
              </View>
            </TouchableHighlight>
          );
        }}
        keyExtractor={(item, index) => index}
      />;
    return (
      <View style={StyleSheet.flatten([styles.bubbleBottom, {width: Dimensions.get('window').width - 20}])}>
        {siteDetails}
        {this.state.showOrientation ? this.drawSectorOrientation() : null}
        <Button
          onPress={() => {this.setState({showOrientation: !this.state.showOrientation})}}
          title={this.state.showOrientation ? "Hide Orientation" : "Show Orientation"}
        />
      </View>
    );
  }
}
