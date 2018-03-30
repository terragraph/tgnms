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

export default class OverviewCard extends Component<Props> {
  // icon to center/keep focus on current position
  render() {
    let details = [
      ['Nodes', (this.props.nodesOnline + "/" + (this.props.nodesOnline + this.props.nodesOffline)),
       'Links', (this.props.linksOnline + "/" + (this.props.linksOnline + this.props.linksOffline))]
    ];
    return (
      <View style={styles.bubbleTopLeft}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderTitle}>
            {this.props.topology.name} Overview
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
OverviewCard.propTypes = {
  topology: PropTypes.object.isRequired,
  nodesOnline: PropTypes.number.isRequired,
  nodesOffline: PropTypes.number.isRequired,
  linksOnline: PropTypes.number.isRequired,
  linksOffline: PropTypes.number.isRequired,
};
