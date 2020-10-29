/**
 * Semicircle extension for L.Circle.
 * Jan Pieter Waagmeester <jieter@jieter.nl>
 *
 * This version is tested with leaflet 1.0.2 (also tested w/ 1.2.0 by HappyZ)
 *
 * Below is the compressed js
 *
 * @format
 */
!(function(t) {
  if ('function' == typeof define && define.amd) define(['leaflet'], t);
  else if ('undefined' != typeof module && 'undefined' != typeof require)
    module.exports = t(require('leaflet'));
  else {
    if ('undefined' == typeof window.L) throw 'Leaflet must be loaded first';
    t(window.L);
  }
})(function(t) {
  function e(t) {
    return (t - 90) * n;
  }
  function i(e, i, n) {
    return e.add(t.point(Math.cos(i), Math.sin(i)).multiplyBy(n));
  }
  var n = Math.PI / 180;
  t.Point.prototype.rotated = function(t, e) {
    return i(this, t, e);
  };
  var r = {
    options: {startAngle: 0, stopAngle: 359.9999},
    startAngle: function() {
      return e(
        this.options.startAngle < this.options.stopAngle
          ? this.options.startAngle
          : this.options.stopAngle,
      );
    },
    stopAngle: function() {
      return e(
        this.options.startAngle < this.options.stopAngle
          ? this.options.stopAngle
          : this.options.startAngle,
      );
    },
    setStartAngle: function(t) {
      return (this.options.startAngle = t), this.redraw();
    },
    setStopAngle: function(t) {
      return (this.options.stopAngle = t), this.redraw();
    },
    setDirection: function(t, e) {
      return (
        void 0 === e && (e = 10),
        (this.options.startAngle = t - e / 2),
        (this.options.stopAngle = t + e / 2),
        this.redraw()
      );
    },
    getDirection: function() {
      return this.stopAngle() - (this.stopAngle() - this.startAngle()) / 2;
    },
    isSemicircle: function() {
      var t = this.options.startAngle,
        e = this.options.stopAngle;
      return !((0 === t && e > 359) || t == e);
    },
    _containsPoint: function(t) {
      function e(t) {
        for (; t <= -Math.PI; ) t += 2 * Math.PI;
        for (; t > Math.PI; ) t -= 2 * Math.PI;
        return t;
      }
      var i = Math.atan2(t.y - this._point.y, t.x - this._point.x),
        n = e(this.startAngle()),
        r = e(this.stopAngle());
      return (
        n >= r && (r += 2 * Math.PI),
        n >= i && (i += 2 * Math.PI),
        i > n &&
          r >= i &&
          t.distanceTo(this._point) <= this._radius + this._clickTolerance()
      );
    },
  };
  (t.SemiCircle = t.Circle.extend(r)),
    (t.SemiCircleMarker = t.CircleMarker.extend(r)),
    (t.semiCircle = function(e, i) {
      return new t.SemiCircle(e, i);
    }),
    (t.semiCircleMarker = function(e, i) {
      return new t.SemiCircleMarker(e, i);
    });
  var o = t.SVG.prototype._updateCircle,
    s = t.Canvas.prototype._updateCircle;
  t.SVG.include({
    _updateCircle: function(e) {
      if (
        !(e instanceof t.SemiCircle || e instanceof t.SemiCircleMarker) ||
        !e.isSemicircle()
      )
        return o.call(this, e);
      if (e._empty()) return this._setPath(e, 'M0 0');
      var i = e._map.latLngToLayerPoint(e._latlng),
        n = e._radius,
        r = Math.round(e._radiusY || n),
        s = i.rotated(e.startAngle(), n),
        a = i.rotated(e.stopAngle(), n),
        l = e.options.stopAngle - e.options.startAngle >= 180 ? '1' : '0',
        c =
          'M' +
          i.x +
          ',' +
          i.y +
          'L' +
          s.x +
          ',' +
          s.y +
          'A ' +
          n +
          ',' +
          r +
          ',0,' +
          l +
          ',1,' +
          a.x +
          ',' +
          a.y +
          ' z';
      this._setPath(e, c);
    },
  }),
    t.Canvas.include({
      _updateCircle: function(e) {
        if (
          !(e instanceof t.SemiCircle || e instanceof t.SemiCircleMarker) ||
          !e.isSemicircle()
        )
          return s.call(this, e);
        var i = e._point,
          n = this._ctx,
          r = e._radius,
          o = (e._radiusY || r) / r,
          a = i.rotated(e.startAngle(), r);
        (this._drawnLayers[e._leaflet_id] = e),
          1 !== o && (n.save(), n.scale(1, o)),
          n.beginPath(),
          n.moveTo(i.x, i.y),
          n.lineTo(a.x, a.y),
          n.arc(i.x, i.y, r, e.startAngle(), e.stopAngle()),
          n.lineTo(i.x, i.y),
          1 !== o && n.restore(),
          this._fillStroke(n, e);
      },
    });
});

/**
 * for visualizer
 * HappyZ <happyzyz@fb.com>
 *
 * This version is tested with leaflet 1.2.0
 */
function onEachFeature(feature, layer) {
  var popupContent = 'Type: ' + feature.geometry.type + '<br>';
  if (feature.properties && feature.properties.popupContent) {
    popupContent = feature.properties.popupContent;
  }
  var popup = layer.bindPopup(popupContent);
  if (feature.info && feature.info.content) {
    var contentViewer = L.Control.extend({
      onAdd: function() {
        var container = L.DomUtil.create('div');
        // DOM element, class_name
        var gauge = L.DomUtil.create('div', 'info_details');
        container.style.width = '400px';
        container.style.background = 'rgba(255,255,255,0.9)';
        container.style.textAlign = 'left';
        gauge.innerHTML = feature.info.content;
        container.appendChild(gauge);
        return container;
      },
    });
    var new_content = new contentViewer();
    layer.on('mouseover', function(e) {
      this.openPopup();
    });
    popup
      .on('popupclose', function(e) {
        new_content.remove(mymap);
        layer.setStyle(feature.properties && feature.properties.style);
        if (feature.towards) {
          for (var i in feature.towards) {
            var node = findNode(feature.towards[i]);
            if (node != null) {
              node.setStyle(feature.properties && feature.properties.style);
            }
          }
        }
      })
      .on('popupopen', function(e) {
        new_content.addTo(mymap);
        layer.setStyle(
          feature.properties && feature.properties.highlight_style,
        );
        if (feature.towards) {
          for (var i in feature.towards) {
            var node = findNode(feature.towards[i]);
            if (node != null) {
              node.setStyle(
                feature.properties && feature.properties.highlight_style,
              );
            }
          }
        }
      });
  }
}

function findNode(nodeName) {
  for (var i in nodes._layers) {
    if (nodes._layers[i].feature.id == nodeName) {
      return nodes._layers[i];
    }
  }
  return null;
}

function runPyScript(input) {
  console.log('before run!');
  $.ajax({
    type: 'POST',
    url: 'http://[2001:470:f0:3e8::c2c]:5000/run_test',
    dataType: 'json',
    data: {param: input},
    success: function(response) {
      var data = JSON.parse(response);
      console.log(data);
    },
  });
}

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
// var background = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
//   attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
// });

HOOK_ADDITIONAL_VARS;

var overlayMaps = {
  'Ignited Links': links,
  Nodes: nodes,
  Sites: sites,
  CONFIG_EXTRA_MAP_OVERLAY,
};

var mymap = L.map('container', {
  center: CONFIG_MAP_CENTER,
  zoom: 18,
  layers: [background, nodes, sites],
});

L.control.layers(null, overlayMaps).addTo(mymap);
mymap.fitBounds(nodes.getBounds());
// basic button actions
$(document).ready(function() {
  // example using ajax to load data from file
  $('#btnLinkTest').click(function() {
    runPyScript();
    console.log('after run!');
  });
  // example using ajax to load data from file
  $('#btnMapIt').click(function() {
    //remove the old layers
    removeLinkUdpData();
    $.ajax({
      url: 'linkJsonDataudp.json',
      cache: false,
      dataType: 'json',
      success: function(geojson) {
        linksudp = L.geoJson(geojson, {
          onEachFeature: onEachFeature,
          style: function(feature) {
            return feature.properties && feature.properties.style;
          },
        });
        linksudp.addTo(mymap);
      },
      error: function() {
        alert('ERROR.');
      },
    });
  });

  function removeLinkUdpData() {
    if (mymap.hasLayer(linksudp)) {
      mymap.removeLayer(linksudp);
    } else if (mymap.hasLayer(linksudptNew)) {
      mymap.removeLayer(linksudptNew);
    }
  }

  $('#btnMapItRemove').click(function() {
    // Removes the layer from the map it is currently active on
    var idx = 1;
    mymap.eachLayer(function(layer) {
      if (mymap.hasLayer(linksudp)) {
        mymap.removeLayer(linksudp);
        console.log('linksudp/sites, layer ID= ' + idx);
      } else if (mymap.hasLayer(linksudptNew)) {
        mymap.removeLayer(linksudptNew);
        console.log('linksudptemp, layer ID= ' + idx);
      }
      idx = idx + 1;
    });
  });

  // example using ajax to load data from file every 10s
  function loadNewData() {
    removeLinkUdpData();
    var feedback = $.ajax({
      url: 'linkJsonDataudp.json',
      cache: false,
      dataType: 'json',
      success: function(geojson) {
        linksudp = L.geoJson(geojson, {
          onEachFeature: onEachFeature,
          style: function(feature) {
            return feature.properties && feature.properties.style;
          },
        });
        linksudp.addTo(mymap);

        // add time out so we do it periodically
        setTimeout(function() {
          loadNewData();
        }, 5000); // 5k ms = 5s
      },
      error: function() {
        alert('ERROR.');
      },
    }).responseText;
  }
  // 2: call it by button clicking (can also do it upon window loading)
  $('#btnMapItTimer').click(function() {
    loadNewData();
  });
});
