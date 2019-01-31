'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GenericDatasourceQueryCtrl = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _sdk = require('app/plugins/sdk');

require('./css/query-editor.css!');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GenericDatasourceQueryCtrl = exports.GenericDatasourceQueryCtrl = function (_QueryCtrl) {
  _inherits(GenericDatasourceQueryCtrl, _QueryCtrl);

  function GenericDatasourceQueryCtrl($scope, $injector) {
    _classCallCheck(this, GenericDatasourceQueryCtrl);

    var _this = _possibleConstructorReturn(this, (GenericDatasourceQueryCtrl.__proto__ || Object.getPrototypeOf(GenericDatasourceQueryCtrl)).call(this, $scope, $injector));

    _this.scope = $scope;
    _this.target.target = _this.target.target || 'enter raw query';
    _this.target.keyname = _this.target.keyname || 'select keyname';
    _this.target.restrictor = _this.target.restrictor || 'select restrictor';
    _this.target.beringeisource = _this.target.beringeisource || "30";
    _this.target.type = _this.target.type || 'timeserie';
    _this.target.scale = _this.target.scale || 1.0;
    _this.target.diff = _this.target.diff || false;
    return _this;
  }

  _createClass(GenericDatasourceQueryCtrl, [{
    key: 'getKeys',
    value: function getKeys(query) {
      return this.datasource.metricFindQuery(query || '', this.target.restrictor);
    }
  }, {
    key: 'getBeringeiSource',
    value: function getBeringeiSource() {
      return new Array({ "text": 1, "value": 1 }, { "text": 30, "value": 30 }, { "text": 900, "value": 900 });
    }
  }, {
    key: 'toggleEditorMode',
    value: function toggleEditorMode() {
      this.target.rawQuery = !this.target.rawQuery;
    }
  }, {
    key: 'onChangeInternal',
    value: function onChangeInternal() {
      this.panelCtrl.refresh(); // Asks the panel to refresh data.
    }
  }, {
    key: 'onChangeQueryStats',
    value: function onChangeQueryStats() {
      this.datasource.buildQuery(query, this.target);
    }
  }, {
    key: 'onScaleChange',
    value: function onScaleChange() {
      // Refresh panel if scale has changed to valid number
      if (!isNaN(this.target.scale)) {
        this.onChangeInternal();
      }
    }
  }]);

  return GenericDatasourceQueryCtrl;
}(_sdk.QueryCtrl);

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
//# sourceMappingURL=query_ctrl.js.map
