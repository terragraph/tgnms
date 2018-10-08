"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GenericDatasource = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _datemath = require("app/core/utils/datemath");

var dateMath = _interopRequireWildcard(_datemath);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// from Stats.thrift
var TYPEAHEADTYPE = { "KEYNAME": 1, "NODENAME": 3, "TOPOLOGYNAME": 4 };
var RESTRICTORTYPE = { "NODE": 1, "LINK": 1 };

var GenericDatasource = exports.GenericDatasource = function () {
  function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
    _classCallCheck(this, GenericDatasource);

    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = { 'Content-Type': 'application/json' };
    this.keyname_options_map = new Map();
    this.editor_options_fallback_map = new Map().set('scale', 1).set('diff', false);
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  _createClass(GenericDatasource, [{
    key: "getTimeFilter",
    value: function getTimeFilter(options) {
      var timeFilter = {};
      if (options && options.rangeRaw) {
        var from = this.getBeringeiTime(options.rangeRaw.from, false);
        var until = this.getBeringeiTime(options.rangeRaw.to, true);
        var fromIsAbsolute = from.toString().endsWith('ms');

        if (until === 'now()' && !fromIsAbsolute) {
          timeFilter.minAgo = from;
        } else if (until === 'now()') {
          timeFilter.minAgo = Math.round((Date.now() - parseInt(from.split('ms')[0])) / (1000.0 * 60));
        } else {
          timeFilter.startTsSec = Math.round(parseInt(from.split('ms')[0]) / 1000.0);
          timeFilter.endTsSec = Math.round(parseInt(until.split('ms')[0]) / 1000.0);
        }
      }
      return timeFilter;
    }
  }, {
    key: "getBeringeiTime",
    value: function getBeringeiTime(date, roundUp) {
      if (_lodash2.default.isString(date)) {
        if (date === 'now') {
          return 'now()';
        }

        var parts = /^now-(\d+)([d|h|m|s])$/.exec(date);
        if (parts) {
          var amount = parseInt(parts[1], 10);
          var unit = parts[2];
          var minAgo = 0;
          switch (unit) {
            case 'd':
              minAgo = amount * 24 * 60;
              break;
            case 'h':
              minAgo = amount * 60;
              break;
            case 's':
              minAgo = Math.round(amount / 60.0);
              break;
            case 'm':
              minAgo = amount;
              break;
          }
          return minAgo;
        }
        date = dateMath.parse(date, roundUp);
      }

      return date.valueOf() + 'ms';
    }
  }, {
    key: "buildQueryParameters",
    value: function buildQueryParameters(options) {
      var _this = this;

      //remove placeholder targets
      options.targets = _lodash2.default.filter(options.targets, function (target) {
        return target.target !== 'enter raw query' && target.rawQuery || !target.rawQuery;
      });

      // set defaults
      this.editor_options_fallback_map.set('scale', options.targets[0].scale).set('diff', options.targets[0].diff);

      this.keyname_options_map = new Map(); // clear in case of query deletion
      for (var i = 0; i < options.targets.length; i++) {
        var new_scale = Number(options.targets[i].scale);
        if (isNaN(new_scale)) {
          new_scale = 1;
        }
        this.keyname_options_map.set(options.targets[i].keyname, { "scale": new_scale, "diff": options.targets[i].diff });
      }

      var timeFilter = this.getTimeFilter(options);

      var targets = _lodash2.default.map(options.targets, function (target) {
        var retObject = new Object();
        retObject.target = {};
        retObject.refId = target.refId;
        retObject.type = target.type || 'rawquery';
        if (target.rawQuery) {
          // a raw query is directly in the form in Stats.thrift::QueryRequest
          var targetnew = {};
          try {
            targetnew = JSON.parse(_this.templateSrv.replace(target.target, options.scopedVars, 'regex'));
          } catch (e) {
            console.log('invalid json object');
            return retObject;
          }
          retObject.target = targetnew;
          return retObject;
        } else {
          // put query in the form in Stats.thrift::QueryRequest
          var restrictor = _this.templateSrv.replace(target.restrictor, options.scopedVars, 'regex');
          var keyname = _this.templateSrv.replace(target.keyname, options.scopedVars, 'regex');
          var beringeisource = _this.templateSrv.replace(target.beringeisource, options.scopedVars, 'regex');

          // build the query
          var _targetnew = {};
          // topologyName comes from a variable called "topology"
          var topologyName = "";
          _this.templateSrv.variables.forEach(function (variable) {
            if (variable.name === "topology") {
              topologyName = variable.current.text;
            }
          });

          _targetnew.topologyName = topologyName;
          if (keyname && keyname !== 'select keyname' && keyname.length > 0) {
            _targetnew.keyNames = new Array(keyname);
          } else {
            return retObject;
          }

          if (restrictor && restrictor !== 'select restrictor' && restrictor.length > 0) {
            // restrictor can be a comma-separated list
            _targetnew.restrictors = new Array();
            var restrictorArray = restrictor.split(',');
            var restrictors = new Object();
            restrictors.values = new Array();
            restrictorArray.forEach(function (rstrcr) {
              restrictors.values.push(rstrcr.trim());
            });
            restrictors.restrictorType = RESTRICTORTYPE["NODE"];
            _targetnew.restrictors.push(restrictors);
          }

          beringeisource = beringeisource || "30";
          _targetnew.dsIntervalSec = parseInt(beringeisource);
          if (timeFilter.minAgo) {
            _targetnew.minAgo = timeFilter.minAgo;
          } else {
            _targetnew.startTsSec = timeFilter.startTsSec;
            _targetnew.endTsSec = timeFilter.endTsSec;
          }

          retObject.target = _targetnew;
          return retObject;
        }
      });

      options.targets = targets;
      return options;
    }
  }, {
    key: "query",
    value: function query(options) {
      var query = this.buildQueryParameters(options);
      query.targets = query.targets.filter(function (t) {
        return !t.hide;
      });

      if (query.targets.length <= 0) {
        return this.q.when({ data: [] });
      }

      if (this.templateSrv.getAdhocFilters) {
        // TODO
        query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
      } else {
        query.adhocFilters = [];
      }

      // build single query from multiple queries
      for (var i = 1; i < query.targets.length; i++) {
        if (query.targets[0].target.keyNames && query.targets[i].target.keyNames) {
          query.targets[0].target.keyNames.push(query.targets[i].target.keyNames[0]);
        }
      }

      return this.doRequest({
        url: this.url + '/stats_query',
        data: query.targets[0].target,
        method: 'POST'
      }).then(this.mapToGrafanaFormat.bind(this));
    }
  }, {
    key: "mapToGrafanaFormat",
    value: function mapToGrafanaFormat(result) {
      if (!result.data.hasOwnProperty('columns') || !result.data.hasOwnProperty('points')) {
        console.log('no columns or points field');
        return result;
      }
      if (result.data.columns.length <= 1) {
        console.log('columns field has only one entry');
        return result;
      }

      if (result.data.points[0].length !== result.data.columns.length) {
        console.log('columns and every element of points same length error');
      }

      var data = new Array();
      // start with i = 1, i = 0 is "time"
      for (var i = 1; i < result.data.columns.length; i++) {
        data.push(new Object());
        var keyname = this.get_keyname_from_target(result.data.columns[i]);
        var editor_options = this.keyname_options_map.get(keyname);
        var scale = editor_options ? editor_options.scale : this.editor_options_fallback_map.get("scale");
        var diff = editor_options ? editor_options.diff : this.editor_options_fallback_map.get("diff");
        data[i - 1].target = result.data.columns[i];
        data[i - 1].datapoints = new Array();
        if (diff) {
          for (var j = 1; j < result.data.points.length; j++) {
            var tmp = new Array();
            var diff_value = void 0;
            if (result.data.points[j][i] === null || result.data.points[j - 1][i] === null) {
              diff_value = null;
            } else {
              diff_value = result.data.points[j][i] - result.data.points[j - 1][i];
            }
            tmp.push(diff_value * scale); // diff_value
            tmp.push(result.data.points[j][0]); // unixTime
            data[i - 1].datapoints.push(tmp);
          }
        } else {
          for (var _j = 0; _j < result.data.points.length; _j++) {
            var _tmp = new Array();
            _tmp.push(result.data.points[_j][i] * scale); // value
            _tmp.push(result.data.points[_j][0]); // unixTime
            data[i - 1].datapoints.push(_tmp);
          }
        }
      }
      delete result.data;
      result.data = data;
      return result;
    }
  }, {
    key: "get_keyname_from_target",
    value: function get_keyname_from_target(target) {
      var keys = this.keyname_options_map.keys();
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = keys[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var key = _step.value;

          if (target.includes(key)) {
            return key;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: "testDatasource",
    value: function testDatasource() {
      return this.doRequest({
        url: this.url + '/',
        method: 'GET'
      }).then(function (response) {
        if (response.status === 200) {
          return { status: "success",
            message: "Data source is working",
            title: "Success" };
        }
      });
    }
  }, {
    key: "annotationQuery",
    value: function annotationQuery(options) {
      var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
      var annotationQuery = {
        range: options.range,
        annotation: {
          name: options.annotation.name,
          datasource: options.annotation.datasource,
          enable: options.annotation.enable,
          iconColor: options.annotation.iconColor,
          query: query
        },
        rangeRaw: options.rangeRaw
      };

      return this.doRequest({
        url: this.url + '/annotations',
        method: 'POST',
        data: annotationQuery
      }).then(function (result) {
        return result.data;
      });
    }
  }, {
    key: "metricFindQuery",
    value: function metricFindQuery(query) {
      // topologyName comes from a variable called "topology"
      var topologyName = "";
      if (this.templateSrv.variables) {
        this.templateSrv.variables.forEach(function (variable) {
          if (variable.name === "topology") {
            topologyName = variable.current.text;
          }
        });
      }
      if (topologyName.length === 0) {
        console.log("must set a variable called 'topology'");
        return [];
      }

      var searchTerm = this.templateSrv.replace(query, null, 'regex');
      var typeaheadType = TYPEAHEADTYPE["KEYNAME"];

      // this is the search from the topology variable
      if (searchTerm === "__bqs_topology_query") {
        typeaheadType = TYPEAHEADTYPE["TOPOLOGYNAME"];
      }
      // a node query is __bqs_[[topology]] where topology is a variable
      else if (searchTerm.includes("__bqs_")) {
          typeaheadType = TYPEAHEADTYPE["NODENAME"];
          topologyName = searchTerm.split('__bqs_')[1]; // just topology name
        }
      var restrictors = [];
      if (this.target && this.target.restrictor && this.target.restrictor.length > 0) {
        restrictorObj = {};
        restrictorObj.restrictorType = RESTRICTORTYPE["NODE"];
        restrictorObj.values = [];
        restrictorObj.values.push(this.target.restrictor);
        restrictors.push(restrictorObj);
      }

      var interpolated = {
        restrictors: restrictors,
        searchTerm: searchTerm,
        topologyName: topologyName,
        typeaheadType: typeaheadType
      };

      return this.doRequest({
        url: this.url + '/stats_typeahead',
        data: interpolated,
        method: 'POST'
      }).then(this.mapToTextValue);
    }
  }, {
    key: "metricFindNodeNames",
    value: function metricFindNodeNames(query) {
      // topologyName comes from a variable called "topology"
      var topologyName = "";
      if (this.templateSrv.variables) {
        this.templateSrv.variables.forEach(function (variable) {
          if (variable.name === "topology") {
            topologyName = variable.current.text;
          }
        });
      }
      if (topologyName.length === 0) {
        console.log("must set a variable called 'topology'");
        return [];
      }

      var interpolated = {
        topologyName: topologyName,
        typeaheadType: TYPEAHEADTYPE["NODENAME"]
      };

      var ret = this.doRequest({
        url: this.url + '/stats_typeahead',
        data: interpolated,
        method: 'POST'
      }).then(this.mapToTextValue);
      return ret;
    }
  }, {
    key: "mapToTextValue",
    value: function mapToTextValue(result) {
      if (result && result.data && _lodash2.default.isArray(result.data)) {
        var _ref;

        var data1d = (_ref = []).concat.apply(_ref, _toConsumableArray(result.data)); // flatten
        return _lodash2.default.map(data1d, function (d, i) {
          if (d && d.keyName) {
            // "keyName" is returned by BQS
            return { text: d.keyName, value: d.keyName };
          } else if (_lodash2.default.isObject(d)) {
            return { text: d, value: d };
          }
          return { text: d, value: d };
        });
      } else {
        return [];
      }
    }
  }, {
    key: "doRequest",
    value: function doRequest(options) {
      options.withCredentials = this.withCredentials;
      options.headers = this.headers;

      return this.backendSrv.datasourceRequest(options);
    }
  }, {
    key: "getTagKeys",
    value: function getTagKeys(options) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.doRequest({
          url: _this2.url + '/tag-keys',
          method: 'POST',
          data: options
        }).then(function (result) {
          return resolve(result.data);
        });
      });
    }
  }, {
    key: "getTagValues",
    value: function getTagValues(options) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        _this3.doRequest({
          url: _this3.url + '/tag-values',
          method: 'POST',
          data: options
        }).then(function (result) {
          return resolve(result.data);
        });
      });
    }
  }]);

  return GenericDatasource;
}();
//# sourceMappingURL=datasource.js.map
