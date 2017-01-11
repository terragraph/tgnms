var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: '[2620:10d:c089:e009:1a66:daff:fee8:de0]:9200'
});

var searchTemplate = {
  "index": "",
  "type": "",
  "body": {
    "from" : 0,
    "size" : 50,
    "query" : {
      "bool": {
        "must": [],
        "must_not": []
      }
    },
    "sort" : []
  }
};

var self = {
  execute: function (elasticTables, req, res, next) {
    let tableName = req.params[0];
    let from = req.params[1];
    let size = req.params[2];
    let must =  req.params[3];
    let must_not =  req.params[4];

    for (var i = 0, len = elasticTables.tables.length; i < len; i++) {
      if(tableName == elasticTables.tables[i].name) {
        var search = searchTemplate;
        search.index = elasticTables.tables[i].index;
        search.type = elasticTables.tables[i].type;
        var sortItem = {};
        var sortItems = [];
        sortItem[elasticTables.tables[i].time] = "desc";
        sortItems.push(sortItem);
        search.body.sort = sortItems;
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
  }
}

module.exports = self;
