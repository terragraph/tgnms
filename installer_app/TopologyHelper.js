/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */
import * as ttypes from './TopologyTypes';

module.exports = {
  Topology() {
    var topology: ttypes.Topology = {
      name: "",
      nodes: [],
      links: [],
      sites: [],
      config: { channel: 0 },
    };
    return topology;
  },

  Location() {
    var location: ttypes.Location = {
      latitude: 0,
      longitude: 0,
    };
    return location;
  },

  Golay() {
    var golay: ttypes.Golay = {
      txGolayIdx: 0,
      rxGolayIdx: 0,
    };
    return golay;
  },

  Site() {
    var site: ttypes.Site = {
      name: "",
      location: module.exports.Location(),
    };
    return site;
  },

  Node() {
    var node: ttypes.Node = {
      name: "",
      node_type: 0,
      is_primary: false,
      mac_addr: "",
      pop_node: false,
      polarity: 0,
      golay_idx: module.exports.Golay(),
      status: 0,
      secondary_mac_addrs: [],
      site_name: "",
      ant_azimuth: 0,
      ant_elevation: 0,
      has_cpe: false,
      prefix: "",
    };
    return node;
  },

  Link() {
    var link: ttypes.Link = {
      name: "",
      a_node_name: "",
      z_node_name: "",
      link_type: 0,
      is_alive: false,
      linkup_attempts: 0,
      golay_idx: module.exports.Golay(),
      control_superframe: 0,
      a_node_mac: "",
      z_node_mac: "",
    };
    return link;
  },

  nodeTypeStr(type: number) {
     return type == 1 ? 'CN' : 'DN';
  },

  polarityStr(polarity: number) {
    if (polarity == 1) {
      return 'Odd';
    } else if (polarity == 2) {
      return 'Even';
    } else if (polarity == 3) {
      return 'Hybrid Odd';
    } else if (polarity == 4) {
      return 'Hybrid Even';
    }
  },

  nodeStatusStr(status: number) {
    if (status == 1) {
      return 'Offline';
    } else if (status == 2) {
      return 'Online';
    } else if (status == 3) {
      return 'Online Initiator';
    }
  },

  timeStampDeltaStr(ts: number) {
    return Math.round((new Date().getTime() / 1000) - ts) + ' seconds ago';
  },

  golayStr(golay: ttypes.Golay) {
    if (golay && golay.txGolayIdx && golay.rxGolayIdx) {
      if (golay.txGolayIdx == golay.rxGolayIdx) {
        return golay.txGolayIdx;
      } else {
        return 'TX: ' + golay.txGolayIdx + ' / RX: ' + golay.rxGolayIdx;
      }
    }
    return '-';
  },

  linkAngle(locationA: ttypes.Location, locationZ: ttypes.Location) {
    var rad = Math.PI / 180,
        lat1 = locationA.latitude * rad,
        lat2 = locationZ.latitude * rad,
        lon1 = locationA.longitude * rad,
        lon2 = locationZ.longitude * rad,
        y = Math.sin(lon2 - lon1) * Math.cos(lat2),
        x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    var bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    bearing = bearing >= 180 ? bearing - 360 : bearing;
    return Math.round(bearing * 100) / 100.0;
  },

  circleCoordinates(width: number, radius: number, degrees: number) {
    let degToRadian = (degrees - 90) * Math.PI / 180;
    let x = width / 2 * Math.cos(degToRadian) + (radius / 2);
    let y = width / 2 * Math.sin(degToRadian) + (radius / 2);
    return [x, y];
  },
};
