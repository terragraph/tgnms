
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableHighlight,
  View
} from 'react-native';
import { styles } from '../styles';
import { nodeTypeStr } from '../TopologyHelper';

export default class SiteCard extends Component<Props> {
  render() {
    const site = this.props.site;
    let nodeList = this.props.topology.nodes.filter(node => {
      return node.site_name == site.name;
    });
    let hasPop = nodeList.filter(node => node.pop_node).length > 0;
    let nodeListSet = new Set(this.props.nodes);
    // add link angle for all wireless links
    let links = [];
    this.props.nodes.forEach(node => {
      if (this.props.linksByNode.hasOwnProperty(node.name)) {
        this.props.linksByNode[node.name].forEach(link => {links.push(link)});
      }
    });
    return (
      <View style={styles.bubbleBottom}>
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
            return (
              <TouchableHighlight onPress={() => this.props.selectNodeFunction(item)}>
                <View style={styles.columns}>
                  <Text style={{flex: 2}}>
                    {item.name}
                  </Text>
                  <Text style={{flex: 3}}>
                    {item.mac_addr}
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
        />
      </View>
    );
  }
}
SiteCard.propTypes = {
  site: PropTypes.object.isRequired,
  topology: PropTypes.object.isRequired,
  //selectNodeFunction: PropTypes.function.isRequired,
  //closeFunction: PropTypes.function.isRequired,
};
