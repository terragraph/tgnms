/*
 * Semicircle extension for L.Circle.
 * Jan Pieter Waagmeester <jieter@jieter.nl>
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
 * This version is tested with leaflet 1.3.0
 */

function highlightTarget(target, toHighlight) {
  // find target by id name from the map
  // TODO: when there are many layers, it can be slow
  myMap.eachLayer(function(layer) {
    if (layer.id && layer.id == target) {
      if (!toHighlight) {
        layer.setStyle(
          layer.feature.properties && layer.feature.properties.style,
        );
      } else {
        layer.setStyle(
          layer.feature.properties && layer.feature.properties.towards_style,
        );
      }
    }
  });
}

function onEachFeature(feature, layer) {
  var popupContent = 'Type: ' + feature.geometry.type + '<br>';
  if (feature.properties && feature.properties.popupContent) {
    popupContent = feature.properties.popupContent;
  }
  var popup = layer.bindPopup(popupContent);

  if (feature.info && feature.info.content) {
    layer
      .on('mouseclick', function(e) {
        this.openPopup();
        layer.setStyle(
          feature.properties && feature.properties.highlight_style,
        );
        if (feature.towards) {
          console.log('trying to find towards ' + feature.towards);
          for (let i in feature.towards) {
            highlightTarget(feature.towards[i], true);
          }
        }
      })
      .on('mouseover', function(e) {
        layer.setStyle(
          feature.properties && feature.properties.highlight_style,
        );
        // $('#link-details-container').html(feature.info.content);
        if (feature.towards) {
          console.log('trying to find towards ' + feature.towards);
          for (let i in feature.towards) {
            highlightTarget(feature.towards[i], true);
          }
        }
      })
      .on('mouseout', function(e) {
        // tweak: if we clicked layer and popup is opened, do not clear style
        if (layer.getPopup().isOpen()) return;
        layer.setStyle(feature.properties && feature.properties.style);
        if (feature.towards) {
          console.log('trying to find towards ' + feature.towards);
          for (let i in feature.towards) {
            highlightTarget(feature.towards[i], false);
          }
        }
      });
    // tweak: only clear style if popup is closed
    popup
      .on('popupclose', function(e) {
        layer.setStyle(feature.properties && feature.properties.style);
        if (feature.towards) {
          console.log('trying to find towards ' + feature.towards);
          for (let i in feature.towards) {
            highlightTarget(feature.towards[i], false);
          }
        }
      })
      .on('popupopen', function(e) {
        sidebar.open('details');
        if (this.id && this.id.includes('link-')) {
          window.location.hash = this.feature.id;
        } else if (
          this.feature.properties.popupContent &&
          this.feature.properties.popupContent.includes('node')
        ) {
          window.location.hash = 'node-' + this.feature.id;
        } else if (
          this.feature.properties.popupContent &&
          this.feature.properties.popupContent.includes('site')
        ) {
          window.location.hash = 'site-' + this.feature.id;
        }
        $('#link-details-container').html(this.feature.info.content);
        // add a hook in case of survey needed inside link-details-container
        if (hookDetailsContainerBefore != null) {
          content = hookDetailsContainerBefore;
          if (content.includes('%LINKNAME%') && this.id.includes('link-')) {
            content = content.replace(/%LINKNAME%/g, this.id);
            $('#link-details-container').prepend(content);
          }
        }
      });
  }
}

// add hook details container
var hookDetailsContainerBefore;
