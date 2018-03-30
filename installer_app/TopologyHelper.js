/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

module.exports = {
  nodeTypeStr(type) {
     return type == 1 ? 'CN' : 'DN';
  },

  polarityStr(polarity) {
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

  nodeStatusStr(status) {
    if (status == 1) {
      return 'Offline';
    } else if (status == 2) {
      return 'Online';
    } else if (status == 3) {
      return 'Online Initiator';
    }
  },

  timeStampDeltaStr(ts) {
    return Math.round((new Date().getTime() / 1000) - ts) + ' seconds ago';
  },

  golayStr(golay) {
    if (golay && golay.txGolayIdx && golay.rxGolayIdx) {
      if (golay.txGolayIdx == golay.rxGolayIdx) {
        return golay.txGolayIdx;
      } else {
        return 'TX: ' + golay.txGolayIdx + ' / RX: ' + golay.rxGolayIdx;
      }
    }
    return '-';
  },

  linkAngle(locationA, locationZ) {
    var rad = Math.PI / 180,
        lat1 = locationA.latitude * rad,
        lat2 = locationZ.latitude * rad,
        lon1 = locationA.longitude * rad,
        lon2 = locationZ.longitude * rad,
        y = Math.sin(lon2 - lon1) * Math.cos(lat2),
        x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    var bearing = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    return bearing >= 180 ? bearing - 360 : bearing;
  },
};
