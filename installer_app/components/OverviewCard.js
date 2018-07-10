/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Dimensions,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableHighlight,
  View
} from 'react-native';
import { styles } from '../styles';
import * as ttypes from '../TopologyTypes';

type Props = {
  topology: ttypes.Topology,
  nodesOnline: number,
  nodesOffline: number,
  linksOnline: number,
  linksOffline: number,
};

export default class OverviewCard extends Component<Props> {
  // icon to center/keep focus on current position
  render() {
    let details = [
      ['Nodes', (this.props.nodesOnline + "/" + (this.props.nodesOnline + this.props.nodesOffline)),
       'Links', (this.props.linksOnline + "/" + (this.props.linksOnline + this.props.linksOffline))]
    ];
    return (
      <View style={StyleSheet.flatten([styles.bubbleTopLeft, {width: Dimensions.get('window').width - 20}])}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>
            {this.props.topology.name}
          </Text>
        </View>
        <View style={styles.rows}>
          {details.map((list, idx) =>
            <View key={"details" + idx} style={styles.columns}>
              {list.map((column, idx) =>
                <Text key={"column" +  idx} style={{flex: 1}}>{column}</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }
}
