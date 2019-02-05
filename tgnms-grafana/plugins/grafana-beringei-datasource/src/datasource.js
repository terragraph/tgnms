import * as dateMath from 'app/core/utils/datemath';
import _ from "lodash";

// from Stats.thrift
const TYPEAHEADTYPE = {"KEYNAME" : 1, "NODENAME" : 3, "TOPOLOGYNAME" : 4};
const RESTRICTORTYPE = {"NODE" : 1, "LINK" : 1};


export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = {'Content-Type': 'application/json'};
    this.keyname_options_map = new Map();
    this.editor_options_fallback_map = new Map().set('scale', 1).set('diff', false);
    if (typeof instanceSettings.basicAuth === 'string' &&
      instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  getTimeFilter(options) {
    let timeFilter = {};
    if (options && options.rangeRaw) {
      const from = this.getBeringeiTime(options.rangeRaw.from, false);
      const until = this.getBeringeiTime(options.rangeRaw.to, true);
      const fromIsAbsolute = from.toString().endsWith('ms');


      if (until === 'now()' && !fromIsAbsolute) {
        timeFilter.minAgo = from;
      }
      else if (until === 'now()') {
        timeFilter.minAgo = Math.round((Date.now() -
        parseInt(from.split('ms')[0]))/(1000.0 * 60));
      }
      else {
        timeFilter.startTsSec = Math.round(parseInt(from.split('ms')[0])/1000.0);
        timeFilter.endTsSec = Math.round(parseInt(until.split('ms')[0])/1000.0);
      }
    }
    return timeFilter;
  }

  getBeringeiTime(date, roundUp) {
    if (_.isString(date)) {
      if (date === 'now') {
        return 'now()';
      }

      const parts = /^now-(\d+)([d|h|m|s])$/.exec(date);
      if (parts) {
        const amount = parseInt(parts[1], 10);
        const unit = parts[2];
        let minAgo = 0;
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

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return ((target.target !== 'enter raw query') && target.rawQuery)
              || !target.rawQuery;
    });

    let timeFilter = this.getTimeFilter(options);

    let targets = _.map(options.targets, target => {
      let retObject = new Object();
      retObject.target = {};
      retObject.refId = target.refId;
      retObject.type = target.type || 'rawquery';
      if (target.rawQuery) {
        // a raw query is directly in the form in Stats.thrift::QueryRequest
        let targetnew = {};
        try {
          targetnew = JSON.parse(this.templateSrv.replace(target.target,
            options.scopedVars, 'regex'));
        }
        catch(e) {
          console.log('Invalid json object');
          return retObject;
        }
        retObject.target = targetnew;
        return retObject;
      } else {
        // put query in the form in Stats.thrift::QueryRequest
        // "replace" command replaces variables with actual value
        // "replace" does not work on numbers or checkboxes - only strings
        const restrictor = this.templateSrv.replace(target.restrictor,
          options.scopedVars, 'regex');
        const keyname = this.templateSrv.replace(target.keyname,
          options.scopedVars, 'regex');
        let beringeisource = target.beringeisource;
        let scale = Number(target.scale);
        scale = isNaN(scale) ? 1.0 : scale;
        const diff = target.diff;

        if (!this.editor_options_fallback_map.get('scale')) {
          this.editor_options_fallback_map.set('scale', scale)
            .set('diff', diff);
        }

        const refId = target.refId;
        this.keyname_options_map.set(
          keyname, {"scale": scale, "diff": diff}
        );

        // build the query
        let targetnew = {};
        // topologyName comes from a variable called "topology"
        let topologyName = "";
        this.templateSrv.variables.forEach(variable => {
          if (variable.name === "topology") {
            topologyName = variable.current.text;
          }
        });

        targetnew.topologyName = topologyName;
        if (keyname && keyname !== 'select keyname' && keyname.length > 0) {
          targetnew.keyNames = new Array (keyname);
        } else {
          return retObject;
        }

        if (restrictor && restrictor !== 'select restrictor' &&
            restrictor.length > 0) {
          // restrictor can be a comma-separated list
          targetnew.restrictors = new Array();
          let restrictorArray = restrictor.split(',');
          let restrictors = new Object();
          restrictors.values = new Array();
          restrictorArray.forEach (rstrcr => {
            restrictors.values.push(rstrcr.trim());
          });
          restrictors.restrictorType = RESTRICTORTYPE["NODE"];
          targetnew.restrictors.push(restrictors);
        }

        beringeisource = beringeisource || "30";
        targetnew.dsIntervalSec = parseInt(beringeisource);
        if (timeFilter.minAgo) {
          targetnew.minAgo = timeFilter.minAgo;
        }
        else {
          targetnew.startTsSec = timeFilter.startTsSec;
          targetnew.endTsSec = timeFilter.endTsSec;
        }

        retObject.target = targetnew;
        return retObject;
      }
    });

    options.targets = targets;
    return options;
  }

  query(options) {
    var query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);

    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    if (this.templateSrv.getAdhocFilters) { // TODO
      query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    } else {
      query.adhocFilters = [];
    }

    // build single query from multiple queries
    for (let i = 1; i < query.targets.length; i++) {
      if (query.targets[0].target.keyNames &&
        query.targets[i].target.keyNames) {
        query.targets[0].target.keyNames.
           push(query.targets[i].target.keyNames[0]);
      }
    }

    return this.doRequest({
      url: this.url + '/stats_query',
      data: query.targets[0].target,
      method: 'POST'
    }).then(this.mapToGrafanaFormat.bind(this));
  }

  mapToGrafanaFormat(result) {
    if (!result.data.hasOwnProperty('columns') ||
        !result.data.hasOwnProperty('points')) {
      console.log('No columns or points field');
      return result;
    }
    if (result.data.columns.length <= 1) {
      console.log('Columns field has only one entry');
      result.data = [];
      return result;
    }

    if (result.data.points[0].length !== result.data.columns.length) {
      console.log('Columns and every element of points same length error');
      result.data = [];
    }

    let data = new Array();
    // start with i = 1, i = 0 is "time"
    // grafana wants: results.data = [{target: "key1"},
    //    {datapoints: [[val,time], [val,time], ...]}, {target: "key2"},
    //    {datapoints: [[val,time], [val,time], ...]}, ...]
    // BQS returns
    //  result.data.columns = ["time", "key1", "key2", ...]
    //  result.data.points = [0:n-1][0] = time
    //  result.data.points = [0:n-1][1] = key1 data
    //  ...
    //  result.data.points = [0:n-1][n] = keyn data
    for (let i = 1; i < result.data.columns.length; i++) {
      data.push(new Object());
      const keyname = this.get_keyname_from_target(result.data.columns[i]);
      const editor_options = this.keyname_options_map.get(keyname);
      const scale = editor_options ? editor_options.scale :
                                this.editor_options_fallback_map.get("scale");
      const diff = editor_options ? editor_options.diff :
                                this.editor_options_fallback_map.get("diff");
      data[i - 1].target = result.data.columns[i];
      data[i - 1].datapoints = new Array();
      if (diff) {
        for (let j = 1; j < result.data.points.length; j++) {
          let tmp = new Array();
          let diff_value;
          if (result.data.points[j][i] === null ||
              result.data.points[j - 1][i] === null) {
            diff_value = null;
          }
          else {
            diff_value =
              (result.data.points[j][i] - result.data.points[j - 1][i]) * scale;
          }
          tmp.push(diff_value);
          tmp.push(result.data.points[j][0]); // unixTime
          data[i - 1].datapoints.push(tmp);
        }
      }
      else {
        for (let j = 0; j < result.data.points.length; j++) {
          let tmp = new Array();
          tmp.push(result.data.points[j][i] === null ? null :
                   result.data.points[j][i] * scale);
          tmp.push(result.data.points[j][0]); // unixTime
          data[i - 1].datapoints.push(tmp);
        }
      }
    }
    result.data = data;
    return result;
  }


  get_keyname_from_target(target) {
    const keys = this.keyname_options_map.keys();
    for (var key of keys) {
      if (target.includes(key)) {
        return key;
      }
    }
  }

  testDatasource() {
    return this.doRequest({
      url: this.url + '/',
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success",
                 message: "Data source is working",
                 title: "Success" };
      }
    });
  }

  annotationQuery(options) {
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
    }).then(result => {
      return result.data;
    });
  }


  metricFindQuery(query, restrictor) {
    // topologyName comes from a variable called "topology"
    let topologyName = "";
    if (this.templateSrv.variables) {
      this.templateSrv.variables.forEach(variable => {
        if (variable.name === "topology") {
          topologyName = variable.current.text;
        }
      });
    }
    if (topologyName.length === 0) {
      console.log("There must set a variable called 'topology'");
      return [];
    }

    let searchTerm = this.templateSrv.replace(query, null, 'regex');
    let typeaheadType = TYPEAHEADTYPE["KEYNAME"];
    let restrictors = [];

    // this is the search from the topology variable
    if (searchTerm === "__bqs_topology_query") {
      typeaheadType = TYPEAHEADTYPE["TOPOLOGYNAME"];
    }
    // A restricted node query is __bqs_noderestrict_[[nodeA]]_[[topology]]
    // to find only the nodes which are linked to [[nodeA]], a MAC address
    else if (searchTerm.includes("__bqs_noderestrict_")) {
      typeaheadType = TYPEAHEADTYPE["NODENAME"];
      const topologyIndex = searchTerm.lastIndexOf("_");
      const nodeAIndex = 19;
      const nodeAstr = searchTerm.slice(nodeAIndex, topologyIndex);
      const topologyName = searchTerm.slice(topologyIndex + 1);
      let restrictorObj = {};
      restrictorObj.values = [];
      restrictorObj.values.push(nodeAstr);
      restrictors.push(restrictorObj);
    }
    // a node query is __bqs_[[topology]] where topology is a variable
    else if (searchTerm.includes("__bqs_")) {
      typeaheadType = TYPEAHEADTYPE["NODENAME"];
      topologyName = searchTerm.split('__bqs_')[1]; // just topology name
    }
    else {
      // the query is a keyname search, not a Grafana variable
      if (typeof(restrictor) === "string" && restrictor.length > 0) {
        typeaheadType = TYPEAHEADTYPE["KEYNAME"];
          let restrictorResolved =
              this.templateSrv.replace(restrictor, null, 'regex');
          let restrictorObj = {};
          restrictorObj.restrictorType = RESTRICTORTYPE["NODE"];
          restrictorObj.values = [];
          restrictorObj.values.push(restrictorResolved);
          restrictors.push(restrictorObj);
      }
      else if (restrictor) {
        console.error("Unexpected restrictor type");
        console.log(restrictor);
        return [];
      }
    }

    var interpolated = {
        noDuplicateKeyNames: true,
        restrictors: restrictors,
        searchTerm: searchTerm,
        topologyName: topologyName,
        typeaheadType: typeaheadType,
    };

    return this.doRequest({
      url: this.url + '/stats_typeahead',
      data: interpolated,
      method: 'POST',
    }).then(this.mapToTextValue);
  }

  metricFindNodeNames(query) {
    // topologyName comes from a variable called "topology"
    let topologyName = "";
    if (this.templateSrv.variables) {
      this.templateSrv.variables.forEach(variable => {
        if (variable.name === "topology") {
          topologyName = variable.current.text;
        }
      });
    }
    if (topologyName.length === 0) {
      console.log("There must set a variable called 'topology'");
      return [];
    }

    var interpolated = {
      topologyName: topologyName,
      typeaheadType: TYPEAHEADTYPE["NODENAME"],
    };

    let ret = this.doRequest({
      url: this.url + '/stats_typeahead',
      data: interpolated,
      method: 'POST',
    }).then(this.mapToTextValue);
    return ret;
  }


  mapToTextValue(result) {
    if (result && result.data && _.isArray(result.data)) {
      const data1d = [].concat(...result.data); // flatten
      let shortNameVec = [];
      data1d.some(d => {
        if (d && d.keyName && d.shortName && d.shortName.length > 0) {
          shortNameVec.push({ text: d.shortName, value: d.shortName });
          return true;
        }
      });
      let keyNameVec = _.map(data1d, (d, i) => {
        if (d && d.keyName) {
          // "keyName" is returned by BQS
          return { text: d.keyName, value: d.keyName };
        } else if (_.isObject(d)) {
          // it will never reach this point
          return { text: d, value: d};
        }
        return { text: d, value: d};
      });
      return shortNameVec.concat(keyNameVec);
    }
    else {
      return [{ text: "BQS not responding", value: "BQS not responding"}];
    }
  }

  doRequest(options) {
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;

    return this.backendSrv.datasourceRequest(options);
  }

  getTagKeys(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-keys',
        method: 'POST',
        data: options
      }).then(result => {
        return resolve(result.data);
      });
    });
  }

  getTagValues(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-values',
        method: 'POST',
        data: options
      }).then(result => {
        return resolve(result.data);
      });
    });
  }

}
