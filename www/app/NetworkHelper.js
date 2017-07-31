/**
 * Shared methods
 */

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
    
  }
};
