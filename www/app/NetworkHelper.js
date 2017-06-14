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
  }
};
