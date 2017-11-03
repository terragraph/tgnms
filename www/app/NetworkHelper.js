/**
 * Shared methods
 */

import LeafletGeom from 'leaflet-geometryutil';
import { LatLng } from 'leaflet';

module.exports = {
  availabilityColor: function(alive_perc) {
    if (alive_perc >= 99.99) {
      return 'green';
    } else if (alive_perc >= 99) {
      return 'yellowgreen';
    } else {
      return 'red';
    }
  },
  // accepts the polarity id, not name
  polarityColor: function(polarity) {
    if (polarity == null || polarity == undefined) {
      return 'red';
    }
    switch (polarity) {
      case 1:
        return 'blue';
      case 2:
        return 'magenta';
      case 3:
        return 'orange';
      default:
        return 'red';
    } 
  },

  chartColor: function(colors, index) {
    let colorIndex = index % colors.length;
    return colors[colorIndex];
  },

  versionSlicer: function(versionName) {
    //RELEASE_M12_3 (michaelcallahan@devbig730 Tue Aug 8 10:48:29 PDT 2017) 
    let releaseIdx = versionName.indexOf('RELEASE_');
    let splitIndex = Math.min(versionName.indexOf('-', releaseIdx), versionName.indexOf(' ', releaseIdx));
    let releaseName = versionName.substring(releaseIdx + 8, splitIndex);
    return releaseName;
  },

  // color node based on DN/CN
  nodeTypeColor: function(nodeType) {
    
  },

  linkLength: function(aSite, zSite) {
    let aSiteCoords = new LatLng(aSite.location.latitude,
                                 aSite.location.longitude);
    let zSiteCoords = new LatLng(zSite.location.latitude,
                                 zSite.location.longitude);
    let linkAngle = LeafletGeom.bearing(aSiteCoords, zSiteCoords);
    let linkLength = LeafletGeom.length([aSiteCoords, zSiteCoords]);
    return linkLength;
  }
};
