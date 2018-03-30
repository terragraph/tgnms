/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { linkAngle } from '../TopologyHelper';
import {
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableHighlight,
  View
} from 'react-native';
import { styles } from '../styles';

export default class LinkCard extends Component<Props> {
  render() {
    // find the coordinates for A/Z locations
    let sitesByName = {};
    this.props.sites.forEach(site => {
      sitesByName[site.name] = site;
    });
    let sitesByNode = {};
    this.props.nodes.forEach(node => {
      sitesByNode[node.name] = node.site_name;
    });
    let siteA = sitesByName[sitesByNode[this.props.link.a_node_name]];
    let siteZ = sitesByName[sitesByNode[this.props.link.z_node_name]];

    // compute the link angle
    let linkAngleDeg = linkAngle(siteA.location, siteZ.location);
    let linkDetails = [
      ['Name (A)', this.props.link.a_node_name],
      ['Name (Z)', this.props.link.z_node_name],
      ['Linkup attempts', this.props.link.linkup_attempts],
      ['Status', (this.props.link.is_alive ? 'Alive' : 'Offline')],
      ['Site A', siteA.name],
      ['Site Z', siteZ.name],
      ['Angle', linkAngleDeg],
    ];
    return (
      <View style={styles.bubbleBottom}>
        <View style={styles.sectionHeader}>
          <TouchableHighlight style={styles.backArrow} onPress={this.props.backFunction}>
            <Text selectable={false} style={styles.bigBox}>&larr;</Text>
          </TouchableHighlight>
          <Text style={styles.sectionHeaderTitle}>
            {this.props.link.name}
          </Text>
          <TouchableHighlight key="close" style={styles.closeBox} onPress={this.props.closeFunction}>
            <Text selectable={false} style={styles.bigBox}>X</Text>
          </TouchableHighlight>
        </View>
        <View style={styles.rows}>
          {linkDetails.map(pair =>
            <View key={pair[0]} style={styles.detailRows}>
              <Text style={{flex: 1}}>{pair[0]}</Text>
              <Text style={{flex: 2}}>{pair[1]}</Text>
            </View>)}
        </View>
      </View>
    );
  }
}
LinkCard.propTypes = {
  link: PropTypes.object.isRequired,
  sites: PropTypes.array.isRequired,
  nodes: PropTypes.array.isRequired,
};
