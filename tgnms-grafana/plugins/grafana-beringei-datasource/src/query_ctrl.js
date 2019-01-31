import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector)  {
    super($scope, $injector);

    this.scope = $scope;
    this.target.target = this.target.target || 'enter raw query';
    this.target.keyname = this.target.keyname || 'select keyname';
    this.target.restrictor = this.target.restrictor || 'select restrictor';
    this.target.beringeisource = this.target.beringeisource || "30";
    this.target.type = this.target.type || 'timeserie';
    this.target.scale = this.target.scale || 1.0;
    this.target.diff = this.target.diff || false;
  }

  getKeys(query) {
    return this.datasource.metricFindQuery(query || '', this.target.restrictor);
  }

  getBeringeiSource() {
    return new Array({"text":1, "value":1},
       {"text":30, "value":30},{"text":900, "value":900});
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }

  onChangeQueryStats() {
    this.datasource.buildQuery(query, this.target);
  }

  onScaleChange() {
    // Refresh panel if scale has changed to valid number
    if (!isNaN(this.target.scale)) {
      this.onChangeInternal();
    }
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
