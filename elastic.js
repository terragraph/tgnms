var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: '[2620:10d:c089:e009:1a66:daff:fee8:de0]:9200'
});

const searchTemplate = '{"index": "", "type": "", "body":\
    {"from" : 0, "size" : 50, "query" :\
    {"bool": { "must": [], "must_not": [] } }, "sort" : [] } }';

var self = {
  getEventLogs: function (elasticEventLogsTables, req, res, next) {
    let tableName = req.params[0];
    let from = req.params[1];
    let size = req.params[2];
    let must =  req.params[3];
    let must_not =  req.params[4];

    for (var i = 0, len = elasticEventLogsTables.tables.length; i < len; i++) {
      if(tableName == elasticEventLogsTables.tables[i].name) {
        var search = JSON.parse(searchTemplate);
        search.index = elasticEventLogsTables.tables[i].index;
        search.type = elasticEventLogsTables.tables[i].type;
        search.body.sort = JSON.parse(
            '[{"' + elasticEventLogsTables.tables[i].time +'" : "desc"}]');
        search.body.from = from;
        search.body.size = size;
        search.body.query.bool.must = JSON.parse(must);
        search.body.query.bool.must_not = JSON.parse(must_not);

        client.search(search).then(function (resp) {
          var hits = resp.hits.hits;
          res.json(hits);
          return;
        }, function (err) {
            console.trace(err.message);
            res.status(404).end("Elasticsearch error\n");
        });
      }
    }
  },

  getSystemLogs: function (elasticSystemLogsSources, req, res, next) {
    let sourceName = req.params[0];
    let from = req.params[1];
    let size = req.params[2];
    let node =  req.params[3];

    for (var i = 0, len = elasticSystemLogsSources.sources.length; i < len; i++) {
      if(sourceName == elasticSystemLogsSources.sources[i].name) {
        var search = JSON.parse(searchTemplate);
        search.index = elasticSystemLogsSources.sources[i].index;
        search.type = node;
        search.body.sort = JSON.parse('[{"timestamp" : "desc"}]');
        search.body.from = from;
        search.body.size = size;

        client.search(search).then(function (resp) {
          var hits = resp.hits.hits;
          //console.log(hits);
          res.json(hits);
          return;
        }, function (err) {
            console.trace(err.message);
            res.status(404).end("Elasticsearch error\n");
        });
      }
    }
  },

  getLinkStatus: function (req, res, next) {
    let linkName = req.params[0];

    var search = JSON.parse(searchTemplate);
    search.index = "terragraph_event_logs";
    search.type = "perfpipe_terragraph_link_status";
    search.body.sort = JSON.parse('[{"int.time" : "desc"}]');
    search.body.query.bool = JSON.parse('{"filter": [\
      {"term": {"normal.message_type": "link_status"}},\
      {"match_phrase": {"normal.link_name": "' + linkName + '"}},\
      {"range": {"int.time": {"gte": "1", "lt": "now/d"}}}\
    ]}');
    search.body.from = 0;
    search.body.size = 1000;
    console.log('query', JSON.stringify(search));
    
    client.search(search).then(function (resp) {
      var hits = resp.hits.hits;
      let linkEvents = [];
      hits.forEach(entry => {
        console.log('source', entry._source.normal.source,
                    'status', entry._source.normal.link_status,
                    'time', new Date(entry._source.int.time * 1000));
      });
      res.json(hits);
      return;
    }, function (err) {
        console.trace(err.message);
        res.status(404).end("Elasticsearch error\n");
    });
  },

  getAlerts: function (req, res, next) {
    let networkName = req.params[0];

    var search = JSON.parse(searchTemplate);
    search.index = "terragraph_alerts";
    search.body.sort = JSON.parse('[{"timestamp" : "desc"}]');
    search.body.from = 0;
    search.body.size = 500;
    search.body.query.bool.must =
        JSON.parse('{"match_phrase" : { "network" : "' + networkName + '"}}');

    client.search(search).then(function (resp) {
      var hits = resp.hits.hits;
      res.json(hits);
      return;
    }, function (err) {
        console.trace(err.message);
        res.status(404).end("Elasticsearch error\n");
    });
  },

  clearAlerts: function (req, res, next) {
    let networkName = req.params[0];

    client.deleteByQuery({
      index: "terragraph_alerts",
      body: {
        query: {
          match_phrase : { network : networkName}}
      }
    }).then(function (resp) {
      res.json(resp);
      return;
    }, function (err) {
        console.trace(err.message);
        res.status(404).end("Elasticsearch error\n");
    });
  },

  deleteAlerts: function (req, res, next) {
    let networkName = req.params[0];
    let ids = JSON.parse(req.params[1]);

    var body = [];
    Object(ids).forEach(function(id) {
      body.push({ delete: { _index: "terragraph_alerts", _type: "level", _id: id } });
    });

    client.bulk({
      body: body
    }).then(function (resp) {
      res.json(resp);
      return;
    }, function (err) {
      console.trace(err.message);
      res.status(404).end("Elasticsearch error\n");
    });
  }
}

module.exports = self;
