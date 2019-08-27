var links = L.geoJSON(linkJsonData, {
  onEachFeature: onEachFeature,
  style: function(feature) {
    return feature.properties && feature.properties.style;
  },
});

var nodes = L.geoJSON(nodeJsonData, {
  style: function(feature) {
    return feature.properties && feature.properties.style;
  },
  onEachFeature: onEachFeature,
  pointToLayer: function(feature, latlng) {
    var my_circle = L.semiCircleMarker(latlng);
    if (
      feature.properties &&
      feature.properties.direction &&
      feature.properties.size
    ) {
      my_circle.setDirection(
        feature.properties.direction,
        feature.properties.size,
      );
    }
    return my_circle;
  },
});

var sites = L.geoJSON(siteJsonData, {
  style: function(feature) {
    return feature.properties && feature.properties.style;
  },
  onEachFeature: onEachFeature,
  pointToLayer: function(feature, latlng) {
    return L.circleMarker(latlng);
  },
});

var background = L.tileLayer(
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

var linksudp = L.geoJSON(linkJsonDataudp, {
    onEachFeature: onEachFeature,
    style: function(feature) {
        return feature.properties && feature.properties.style;
    }
});

var multihop = L.geoJSON(nodeJsonDataMultihop, {
  style: function(feature) {
    return feature.properties && feature.properties.style;
  },
  onEachFeature: onEachFeature,
  pointToLayer: function(feature, latlng) {
    var my_circle = L.semiCircleMarker(latlng);
    if (
      feature.properties &&
      feature.properties.direction &&
      feature.properties.size
    ) {
      my_circle.setDirection(
        feature.properties.direction,
        feature.properties.size,
      );
    }
    return my_circle;
  },
});

var ignition = L.geoJSON(linkJsonDataIgnition, {
  onEachFeature: onEachFeature,
  style: function(feature) {
    return feature.properties && feature.properties.style;
  },
});

var overlayMaps = {
  'Link Ignited': links,
  'Nodes': nodes,
  'Sites': sites,
  'Link healthiness': linksudp,
  'Multihop': multihop,
  'Ignition': ignition
};

var initialLayers;
if (current_test === "Link healthiness") {
  initialLayers = [background, linksudp];
} else if (current_test === "Multihop") {
  initialLayers = [background, multihop];
} else if (current_test === "Ignition") {
  initialLayers = [background, ignition];
}
var mymap = L.map('container', {
  center: [37.334452126, -121.890949747],
  zoom: 18,
  layers: initialLayers,
});

// dynamically changing legend
var legend = L.control({position: 'topleft'});
var showLegend = true;
var ctlLayers = L.control.layers(
  null,
  overlayMaps,
  // {collapsed:false}
).addTo(mymap);
console.log("current_test= " + current_test);
console.log(result_refresh_time);
deriveLegend(current_test);

// L.control.navbar().addTo(mymap);
mymap.fitBounds(nodes.getBounds());
// display initial legend - pick link health to start
mymap.on('overlayadd', function(e) {
  var strDiv = e.name;
  var test_layers = ['Link healthiness', 'Multihop', 'Ignition'];
  if (test_layers.indexOf(strDiv) !== -1)
    current_test = strDiv;
    showLegend = true;
    deriveLegend(strDiv);
});

mymap.on('overlayremove', function(e) {
  var strDiv = e.name;
  console.log('hide "' + strDiv + '" layer');
});
