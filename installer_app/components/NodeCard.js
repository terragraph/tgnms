/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableHighlight,
  View
} from 'react-native';
import {
  golayStr,
  linkAngle,
  nodeStatusStr,
  nodeTypeStr,
  polarityStr,
  timeStampDeltaStr
} from '../TopologyHelper';
import { styles } from '../styles';

export default class NodeCard extends Component<Props> {
  decodeQrToMacAddr(qrStr) {
      //SN:TG100P05431700009:M60:2CD-CAD1DDD2B
      //SN:TG100P05431700009:M60:2CD-CAD1DDD2B
      let indexMac = qrStr.indexOf(':M60:');
      if (indexMac != -1) {
        // looks somewhat valid?
        let remainStr = qrStr.substring(indexMac + 5).toLowerCase();
        if (remainStr.length != 12) {
          return qrStr;
        }
        let macAddr = '';
        for (let i = 0; i < remainStr.length; i += 2) {
          let twoChar = remainStr.substring(i, i + 2);
          // add mac addr separators
          macAddr = macAddr.length == 0 ? twoChar : (macAddr + ':' + twoChar);
        }
        return macAddr;
      }
      return qrStr;
  }

  render() {
    const node = this.props.node;
    let linkList = this.props.topology.links.filter(link => {
      return (node.name == link.a_node_name || node.name == link.z_node_name) && link.link_type == 1;
    });

    let callbackFunc = (e) => {
      Alert.alert(
        'QR Found',
        'Update MAC address for "' + node.name +
        '" from "' + node.mac_addr + '" to "' +
        this.decodeQrToMacAddr(e.data) + '"',
        [
          {text: 'Update', onPress: () => console.log('Ask me later pressed')},
          {text: 'Force Update', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
          {text: 'Cancel', onPress: () => console.log('OK Pressed')},
        ],
        { cancelable: true }
      );
    };
    let nodeDetails = [
      ['MAC',
          <View style={{flex: 2, flexDirection: 'row'}}>
            <Text selectable={false}>
              {node.mac_addr}
            </Text>
            <TouchableHighlight style={{marginLeft: 5}} onPress={() => {
                // pass callback function to get the decoded scan
                this.props.showCameraFunction(callbackFunc);
              }}>
              <Text style={styles.linkText}>(Scan QR)</Text>
            </TouchableHighlight>
          </View>
        ],
      ['Type', nodeTypeStr(node.node_type)],
      ['Primary', (node.is_primary ? 'Yes' : 'No')],
      ['POP', (node.pop_node ? 'Yes' : 'No')],
      ['Status', nodeStatusStr(node.status)],
      ['Polarity', polarityStr(node.polarity)],
      ['Golay', golayStr(node.golay_idx)],
    ];
    // match status status
    let version;
    let ubootVersion;
    let ipv6Address;
    let timestamp;
    if (this.props.statusDump &&
        this.props.statusDump.statusReports &&
        this.props.statusDump.statusReports.hasOwnProperty(node.mac_addr)) {
      let statusDump = this.props.statusDump.statusReports[node.mac_addr];
      version = statusDump.version.replace("Facebook Terragraph Release ", "").replace("\n", "");
      nodeDetails.push(['SW Version', version]);
      ubootVersion = statusDump.ubootVersion.replace("\n", "");
      nodeDetails.push(['Uboot Version', ubootVersion]);
      ipv6Address = statusDump.ipv6Address;
      nodeDetails.push(['IPv6 Address', ipv6Address]);
      timestamp = statusDump.timeStamp;
      nodeDetails.push(['Last Report', timeStampDeltaStr(timestamp)]);
    }
    return (
      <View style={styles.bubbleBottom}>
        <SectionList
          sections={[
              {title: node.name, data: linkList}
          ]}
          renderSectionHeader={({section}) => {
            return [
              <View key="title" style={styles.sectionHeader}>
                <TouchableHighlight style={styles.backArrow} onPress={this.props.backFunction}>
                  <Text selectable={false} style={styles.bigBox}>&larr;</Text>
                </TouchableHighlight>
                <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
                <TouchableHighlight key="close" style={styles.closeBox} onPress={this.props.closeFunction}>
                  <Text selectable={false} style={styles.bigBox}>X</Text>
                </TouchableHighlight>
              </View>,
              <View key="node_details" style={styles.rows}>
                {nodeDetails.map(pair =>
                  <View key={pair[0]} style={styles.detailRows}>
                    <Text style={{flex: 1}}>{pair[0]}</Text>
                    {typeof(pair[1]) == 'object' ?
                      pair[1] :
                      <Text style={{flex: 2}}>{pair[1]}</Text>
                    }
                  </View>)}
              </View>,
              <View key="header" style={[styles.columns, styles.headerRow]}>
                <Text style={{flex: 2}}>
                  A Node
                </Text>
                <Text style={{flex: 2}}>
                  Z Node
                </Text>
                <Text style={{flex: 1}}>
                  Tries
                </Text>
                <Text style={{flex: 1}}>
                  Status
                </Text>
              </View>
            ];
          }}
          renderItem={({item}) => {
            return (
              <TouchableHighlight onPress={() => this.props.selectLinkFunction(item)}>
                <View style={styles.columns}>
                  <Text style={{flex: 2}}>
                    {item.a_node_name}
                  </Text>
                  <Text style={{flex: 2}}>
                    {item.z_node_name}
                  </Text>
                  <Text style={{flex: 1}}>
                    {item.linkup_attempts}
                  </Text>
                  <Text style={{flex: 1}}>
                    {item.is_alive ? 'Alive' : 'Offline'}
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
NodeCard.propTypes = {
  node: PropTypes.object.isRequired,
  topology: PropTypes.object.isRequired,
  statusDump: PropTypes.object.isRequired,
};
