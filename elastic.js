var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: '[2620:10d:c089:e009:1a66:daff:fee8:de0]:9200'
});

var self = {
  execute: function (elasticTables, req, res, next) {
    let tableName = req.params[0];
    let from = req.params[1];
    let size = req.params[2];
    console.log("executeSearch for " + tableName +
                "\n from: " + from +
                "\n Size: " + size);

    for (var i = 0, len = elasticTables.tables.length; i < len; i++) {
      if(tableName == elasticTables.tables[i].name) {
        let search = elasticTables.tables[i].search;
        search.body.from = from;
        search.body.size = size;
        client.search(elasticTables.tables[i].search).then(function (resp) {
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
