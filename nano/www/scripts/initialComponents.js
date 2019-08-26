var apiServerIP = '';
var apiServerPort = '';
var queryLimit = 50;
var apiServerStateStep = 10;  // seconds
var localStorageExpireDays = 1;

var mapBackground = L.tileLayer(
  'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?' +
    'access_token={accessToken}',
  {
    attribution:
      'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>' +
      ' contributors',
    id: 'mapbox.light',
    maxNativeZoom: 18,
    maxZoom: 21,
    accessToken:
      'pk.eyJ1IjoiaGFwcHl6eXoiLCJhIjoiY2o3OXg4djF6MDh' +
      'jaTJ3cGx0bzJrMXRxdSJ9.cHelRODDJmZA9tb_K51RyA',
  },
);

var mapStreets = L.tileLayer(
  'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?' +
    'access_token={accessToken}',
  {
    attribution:
      'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>' +
      ' contributors',
    id: 'mapbox.streets',
    maxNativeZoom: 18,
    maxZoom: 21,
    accessToken:
      'pk.eyJ1IjoiaGFwcHl6eXoiLCJhIjoiY2o3OXg4djF6MDh' +
      'jaTJ3cGx0bzJrMXRxdSJ9.cHelRODDJmZA9tb_K51RyA',
  },
);

var mapSatellite = L.tileLayer(
  'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?' +
    'access_token={accessToken}',
  {
    attribution:
      'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>' +
      ' contributors',
    id: 'mapbox.satellite',
    maxNativeZoom: 18,
    maxZoom: 21,
    accessToken:
      'pk.eyJ1IjoiaGFwcHl6eXoiLCJhIjoiY2o3OXg4djF6MDh' +
      'jaTJ3cGx0bzJrMXRxdSJ9.cHelRODDJmZA9tb_K51RyA',
  },
);

var myMap = L.map('map', {
  center: [37.334452126, -121.890949747],
  zoom: 18,
  layers: [mapBackground]
});

var baseMaps = {
  "<i class='fa fa-star'></i> Light": mapBackground,
  "<i class='fa fa-road'></i> Streets": mapStreets,
  "<i class='fa fa-plane'></i> Satellite": mapSatellite
}

var overlayMaps = {};
var overlayMapOrder = [];  // use this to track who is on the top of the map
// customize control layer with legend
L.Control.Layers.WithLegend = L.Control.Layers.extend({
  _onInputClick: function () {
    L.Control.Layers.prototype._onInputClick.call(this);
    // first remove legend
    removeLegend();
    // find layers that are displayed
    var inputs = this._layerControlInputs,
        input, layer;
    var addedLayers = [];
    for (var i = inputs.length - 1; i >= 0; i--) {
      input = inputs[i];
      layer = this._getLayer(input.layerId).layer;
      if (input.checked && input.type == 'checkbox') {
        addedLayers.push(layer);
        if (!overlayMapOrder.includes(layer)) {
          overlayMapOrder.push(layer);
        }
      } else if (overlayMapOrder.includes(layer)) {
          overlayMapOrder.splice(overlayMapOrder.indexOf(layer), 1);
      }
    }
    // add legend only for the one on the top of the map
    if (overlayMapOrder[overlayMapOrder.length - 1] != null) {
      addLegend(
        overlayMapOrder[overlayMapOrder.length - 1].legend,
        overlayMapOrder[overlayMapOrder.length - 1].time
      );
    }
  }
});
L.control.layers.withlegend = function(opts) {
    return new L.Control.Layers.WithLegend(opts);
}
var ctlLayers = L.control.layers.withlegend(
  baseMaps,
  overlayMaps
).addTo(myMap);

var myLegend = L.control({position: 'topleft'});

var sidebar;

var translator = new Translater({tag: "script"});
