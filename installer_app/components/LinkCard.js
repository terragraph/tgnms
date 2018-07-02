/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { linkAngle } from '../TopologyHelper';
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
import { styles } from '../styles';
import { LineChart, Grid } from 'react-native-svg-charts'

const DISPLAY_CHART_SECONDS = 20;

export default class LinkCard extends Component<Props> {
  state = {
    showStats: false,
    stats: [],
  };

  constructor(props) {
    super(props);

    this.refreshLinkStats();
    setInterval(() => {
      this.refreshLinkStats();
    }, 1000);
  }

  refreshLinkStats() {
    /* TODO - we need to restrict this to only the link we care about */
    // construct the link queries
    let linkQueries = {
      topologyName: this.props.topology.name,
      nodeQueries: [],
      linkQueries: [
        {
          name: "SNR",
          type: "none",
          metric: "snr",
          min_ago: 1,
          linkNameRestrictor: this.props.link.name,
          interval: 1
        },
        {
          name: "RSSI",
          type: "none",
          metric: "rssi",
          min_ago: 1,
          linkNameRestrictor: this.props.link.name,
          interval: 1
        }
      ]
    };
    fetch(this.props.network.queryServiceUrl + '/table_query', {
        headers: this.props.network.authHeaders,
        method: 'post',
        body: JSON.stringify(linkQueries),
        //body: '{"topologyName": "Lab Alignment","nodeQueries": [],"linkQueries": [{"name": "SNR","type": "none","metric": "snr","min_ago": 1, "linkNameRestrictor": "link-RF1.p1-RF2.p1", "interval": 1},{"name": "RSSI","type": "none","metric": "rssi","min_ago": 1, "linkNameRestrictor": "link-RF1.p1-RF2.p1", "interval": 1}]}'
      })
    .then((response) => response.json())
    .then((responseJson) => {
      if (responseJson && responseJson.length > 0 && responseJson[0].hasOwnProperty("columns")) {
        // ensure we received all 4 items
        if (responseJson[0].columns.length == 5) {
          // response order should be the same
          let linkStats = [
            { name: 'SnR (A)', scale: 'snr', data: [] },
            { name: 'SnR (Z)', scale: 'snr', data: [] },
            { name: 'RSSI (A)', scale: 'rssi', data: [] },
            { name: 'RSSI (Z)', scale: 'rssi', data: [] },
          ];

          for (let i = 1; i < responseJson[0].columns.length; i++) {
            // take point from each
            const points = responseJson[0].points.map(pointList => pointList[i])
                           .filter(point => point != null && point != 0);
            linkStats[i - 1].data = points.slice(-DISPLAY_CHART_SECONDS);
          }
          this.setState({
            stats: linkStats
          });
        } else {
          // TODO: not enough data, show error on the stats view?
          this.setState({
            stats: undefined,
          });
        }
      }
    })
    .catch((error) =>
      this.setState({
        stats: []
      })
    );
  }

  gridScale(name) {
    if (name == 'snr') {
      return {min: 12, max: 20};
    } else if (name == 'rssi') {
      return {min: -50, max: -40};
    }
    return {min: 0, max: 30};
  }

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
    let section;
    if (this.state.showStats) {
      let data = [ {name: 'No data', scale: 'none', data: []} ];

      if (this.state.stats && this.state.stats.length > 0) {
        data = this.state.stats;
        section =
          <View style={styles.rows}>
            {data.map(details => {
              let gridScale = this.gridScale(details.scale);
              return (
                <View key="link-details" style={styles.detailRows}>
                  <Text style={{flex: 1}} selectable={false}>{details.name}</Text>
                  <LineChart
                    style={{ height: 100 , width: 200 }}
                    data={ details.data }
                    svg={{ stroke: 'rgb(134, 65, 244)' }}
                    contentInset={{ top: 0, bottom: 0 }}
                    gridMin={ gridScale.min }
                    gridMax={ gridScale.max }>
                    <Grid/>
                  </LineChart>
                </View>
              );
            })}
          </View>;
      } else {
        section =
          <View key="link-details" style={styles.detailRows}>
            <Text style={{flex: 1, fontSize: 24, textAlign: 'center'}} selectable={false}>
              No Link Data Available
            </Text>
          </View>;
      }
    } else {
      section =
        <View style={styles.rows}>
          {linkDetails.map(pair =>
            <View key={pair[0]} style={styles.detailRows}>
              <Text style={{flex: 1}}>{pair[0]}</Text>
              <Text style={{flex: 2}}>{pair[1]}</Text>
            </View>)}
          <View key="viewstats" style={styles.detailRows}>
            <Button
              style={{flex: 2}}
              onPress={() => {this.setState({showStats: true})}}
              title="Stats"
            />
          </View>
        </View>;
    }
    return (
      <View style={StyleSheet.flatten([styles.bubbleBottom, {width: Dimensions.get('window').width - 20}])}>
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
        {section}
      </View>
    );
  }
}
LinkCard.propTypes = {
  link: PropTypes.object.isRequired,
  sites: PropTypes.array.isRequired,
  nodes: PropTypes.array.isRequired,
};
