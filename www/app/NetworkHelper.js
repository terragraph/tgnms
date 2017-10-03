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
