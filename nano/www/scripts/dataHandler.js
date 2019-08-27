function toTitleCase(str) {
  // captitalize first letter of every word in string
  return str.replace(/\w\S*/g, function(txt){
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}


function removeLegend() {
  // remove legend from map
  myMap.removeControl(myLegend);
}

function addLegend(legend, timestamp) {
  stats = legend[0];
  stats2 = legend[1];  // optional to have
  // add legend to map with corresponding stats (an array of 4-element tuples)
  if (stats == null) {  // if stats not available, use stats2
    if (stats2 == null) return;  // if stats2 is also unavailable
    stats = stats2;
    stats2 = null;
  }
  myLegend.onAdd = function (map) {
    this._container = L.DomUtil.create('div', 'legend');
    this._container.innerHTML = timestamp + '<br>';
    for (let i = 0; i < stats.length; i ++) {
      if (stats[i].length < 4) {
        // handle errors when we do not have 4-element tuples
        console.log('Error loading stats at ' + i + ' with ' + stats[i]);
        continue;
      }
      this._container.innerHTML += '<i style="border:2px solid white; ' +
        'background:' + stats[i][1] + '">&nbsp;&nbsp;</i>&nbsp;&nbsp;' +
        stats[i][0] + ': ' + stats[i][2] + ' (' +
        stats[i][3] + '%)<br>';
    }
    if (stats2 != null) {
      for (let i = 0; i < stats2.length; i ++) {
        if (stats2[i].length < 4) {
          // handle errors when we do not have 4-element tuples
          console.log('Error loading stats2 at ' + i + ' with ' + stats2[i]);
          continue;
        }
        this._container.innerHTML += '<i style="border:2px solid ' +
          stats2[i][1] + '">&nbsp;&nbsp;</i>&nbsp;&nbsp;' +
          stats2[i][0] + ': ' + stats2[i][2] + ' (' +
          stats2[i][3] + '%)<br>';
      }
    }
    return this._container;
  };
  myLegend.onRemove = function (map) {
    L.DomUtil.remove(this._container);
  };
  myLegend.addTo(myMap);
}


function updateControlLayer(layer, toAdd) {
  // update control layer
  // assume ctlLayers is already initialized in initialComponents.js
  // here we use file name as the name of layer to display
  if (toAdd == 1) {  // base layer
    ctlLayers.addBaseLayer(
        layer,
        toTitleCase(
          layer.id.replace('.json', '').replace(new RegExp('_', 'g'), ' ')
        )
    );
  } else if (toAdd == 2) {  // overlay layer
    ctlLayers.addOverlay(
        layer,
        toTitleCase(
          layer.id.replace('.json', '').replace(new RegExp('_', 'g'), ' ')
        )
    );
    overlayMapOrder.push(layer);
  } else {
    ctlLayers.removeLayer(layer);
    if (overlayMapOrder.includes(layer)) {
      overlayMapOrder.splice(overlayMapOrder.indexOf(layer), 1);
    }
  }
}


function removeLayer(layerId, myMap) {
  // remove layer by layerId
  myMap.eachLayer(function (layer) {
    if (layer.id && layer.id == layerId) {
      console.log('removing layer ' + layerId + ' before adding the same');
      myMap.removeLayer(layer);
      updateControlLayer(layer, 0);
    }
  });
  // remove on control layer if myMap does not display the layer yet
  for (let i = 0; i < ctlLayers._layers.length; i++) {
      if (ctlLayers._layers[i].layer.id &&
          ctlLayers._layers[i].layer.id == layerId) {
          console.log('removing layer ' + layerId + ' before adding the same');
          updateControlLayer(ctlLayers._layers[i].layer, 0);
          break;
      }
  }
}


function loadDataFromJson(data, fname, autofly) {
  // handle if data is null
  if (data == null) return;
  // load data input as geojson format
  var tmpLayer = L.geoJSON(data, {
    onEachFeature: onEachFeature,
    style: function(feature) {
      return feature.properties && feature.properties.style;
    },
    pointToLayer: function(feature, latlng) {
      if (feature.geometry.type != "Point") return null;
      if (feature.properties && feature.properties.direction) {
        // if we want a semicircle
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
      } else {
        // if we want circle only
        return L.circleMarker(latlng);
      }
    }
  });
  // set id for future look up
  tmpLayer.id = fname;
  tmpLayer.time = data.time;
  tmpLayer.legend = [data.stats, data.stats2];
  console.log('tmpLayer.id = ' + tmpLayer.id);
  // remove the same layer if it already exists and add this layer to map
  removeLayer(fname, myMap);
  tmpLayer.addTo(myMap);
  // add legend initially
  addLegend(tmpLayer.legend, tmpLayer.time);
  // update control layout
  updateControlLayer(tmpLayer, 2);
  // set id for each layer inside layer
  for (let i in tmpLayer._layers) {
    tmpLayer._layers[i].id = tmpLayer._layers[i].feature.id;
  }
  if (autofly) {
    // stop current animation first, then fly
    myMap.setView(myMap.getCenter(), myMap.getZoom(), {"animate": false});
    myMap.fitBounds(tmpLayer.getBounds());
  }
  // handle hashtag
  hash_action(window.location.hash.slice(1));
}


function loadData(fname, myMap) {
  // load json data from fname and add to map
  console.log('loading ' + fname);
  $.ajax({
    url: './defaults/' + fname,
    cache: false,
    dataType: 'json',
    contentType: 'application/json',
    success: function(data) {
      try {
        loadDataFromJson(data, fname, false);
      }
      catch (err) {
        console.log('err to geojson data: ' + err);
      }
    },
    error: function (data, err) {
      console.log('err to load data: ' + err);
    }
  });
  return fname;
}


function loadConfig(fname, myMap) {
  // load config file
  console.log('loading config ' + fname);
  $.ajax({
    url: './' + fname,
    cache: false,
    dataType: 'json',
    contentType: 'application/json',
    success: function(data) {
      // set the center and zoom index by default
      center = data.initMapCenter;
      zoomIdx = data.initZoomIdx;
      myMap.setView(center, zoomIdx, {"animate": false});
      // set server api ip and port
      apiServerIP = data.apiServerIP;
      apiServerPort = data.apiServerPort;
      queryLimit = data.queryLimit;
      apiServerStateStep = data.apiServerStateStep;
      // set network name for titles and summary title text
      if (data.networkName != null) {
        $("#summary .sidebar-header-text")
        .append(" @ " + data.networkName);
        document.title = "NANO @ " + data.networkName;
      }
      // set up local storage expiring days
      if (data.localStorageExpireDays != null) {
        localStorageExpireDays = data.localStorageExpireDays;
      }
      for (let i in data.defaultLayers) {
        var layerID = loadData(data.defaultLayers[i], myMap);
        if (layerID != null) {
          console.log('added ' + layerID + ' to map');
        }
      }
    },
    error: function (data, err) {
      console.log('err to load data: ' + err);
    }
  });
}
