
if (!process.env.NODE_ENV) {
  process.env.BABEL_ENV = 'development';
  process.env.NODE_ENV = 'development';
} else {
  process.env.BABEL_ENV = process.env.NODE_ENV;
}

const {
  BERINGEI_QUERY_URL,
} = require('./server/config');
const {
  getConfigByName,
  getNetworkInstanceConfig,
  reloadInstanceConfig,
} = require('./server/topology/model');
const {getAnalyzerData} = require('./server/topology/analyzer_data');
const topologyPeriodic = require('./server/topology/periodic');
const topologyTTypes = require('./thrift/gen-nodejs/Topology_types');
const express = require('express');
const fs = require('fs');
const path = require('path');
const request = require('request');

// set up font awesome here

const compression = require('compression');

// packaging
const webpack = require('webpack');
const devMode = process.env.NODE_ENV !== 'production';
const port = devMode && process.env.PORT ? process.env.PORT : 80;

const app = express();
app.use(compression());
const queryHelper = require('./queryHelper');
// new json writer
const dataJson = require('./dataJson');
// load the initial node ids
dataJson.refreshNodes();

const ipaddr = require('ipaddr.js');
const pty = require('pty.js');


var fbinternal = {};

// serve static js + css
app.use('/static', express.static(path.join(__dirname, 'static')));
app.set('views', './views');
app.set('view engine', 'pug');

const expressWs = require('express-ws')(app);

// newer charting, for multi-linechart/row
app.post(/\/multi_chart\/$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function (chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function () {
    // proxy query
    const chartUrl = BERINGEI_QUERY_URL + '/query';
    const httpData = JSON.parse(httpPostData);
    const queryRequest = { queries: httpData };
    request.post(
      {
        url: chartUrl,
        body: JSON.stringify(queryRequest),
      },
      (err, httpResponse, body) => {
        if (err) {
          console.error('Failed on /multi_chart', err);
          return;
        }
        if (httpResponse) {
          res.send(httpResponse.body).end();
        } else {
          res
            .status(500)
            .send('No Data')
            .end();
        }
      }
    );
  });
});

app.get('/stats_ta/:topology/:pattern', function (req, res, next) {
  const taUrl = BERINGEI_QUERY_URL + '/stats_typeahead';
  const taRequest = {
    topologyName: req.params.topology,
    input: req.params.pattern,
  };
  request.post(
    {
      url: taUrl,
      body: JSON.stringify(taRequest),
    },
    (err, httpResponse, body) => {
      if (err) {
        console.error('Error fetching from beringei:', err);
        res.status(500).end();
        return;
      }
      res.send(body).end();
    }
  );
});

// http://<address>/scan_results?topology=<topology name>&
//    filter[row_count]=<row_count>&
//    filter[offset]=<offset>&
//    filter[nodeFilter0]=<nodeFilter0>
//    filter[nodeFilter1]=<nodeFilter1>
// /i means ignore case
app.get(/\/scan_results$/i, function(req, res) {
  const topologyName = req.query.topology;
  const filter = {};
  filter.nodeFilter = [];
  filter.row_count = parseInt(req.query.filter.row_count, 10);
  filter.nodeFilter[0] = req.query.filter.nodeFilter0;
  filter.nodeFilter[1] = req.query.filter.nodeFilter1;
  filter.offset = parseInt(req.query.filter.offset, 10);
  dataJson.readScanResults(topologyName, res, filter);
});

// http://<address>/scan_results?topology=<topology name>&
//    filter[filterType]=<filter type>&
//    filter[testtime]=<test time>
//  filter type is "GROUPS" or "TESTRESULTS"
//  testtime is in ms (unix time)
// /i means ignore case
app.get(/\/self_test$/i, function(req, res) {
  const topologyName = req.query.topology;
  const filter = {};
  filter.filterType = req.query.filter.filterType;
  filter.testtime = req.query.filter.testtime;
  dataJson.readSelfTestResults(topologyName, res, filter);
});

// raw stats data
app.get(/\/link_analyzer\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const analyzerData = getAnalyzerData(topologyName);
  if (analyzerData !== null) {
    res.send(analyzerData).end();
  } else {
    console.log('No analyzer cache found for', topologyName);
    res.send('No analyzer cache').end();
  }
});

// raw stats data
app.get(/\/overlay\/linkStat\/(.+)\/(.+)$/i, function(req, res, next) {
  const topologyName = req.params[0];
  const metricName = req.params[1];
  const linkMetrics = [
    {
      name: 'not_used',
      metric: metricName,
      type: 'latest',
      min_ago: 60, /* 1 hour */
    },
  ];
  const query = {
    topologyName: topologyName,
    nodeQueries: [],
    linkQueries: linkMetrics,
  };
  const chartUrl = BERINGEI_QUERY_URL + '/table_query';
  request.post(
    {
      url: chartUrl,
      body: JSON.stringify(query),
    },
    (err, httpResponse, body) => {
      if (err) {
        console.error('Error fetching from beringei:', err);
        res
          .status(500)
          .send('Error fetching data')
          .end();
        return;
      }
      res.send(httpResponse.body).end();
    }
  );
});

// proxy requests for OSM to a v6 endpoint
app.get(/^\/tile\/(.+)\/(.+)\/(.+)\/(.+)\.png$/, function (req, res, next) {
  const z = req.params[1];
  const x = req.params[2];
  const y = req.params[3];
  // fetch png
  const tileUrl =
    'http://orm.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
  request(tileUrl).pipe(res);
});

app.use('/apiservice', require('./server/apiservice/routes'));
app.use('/controller', require('./server/controller/routes'));
app.use('/dashboards', require('./server/dashboard/routes'));
app.use('/topology', require('./server/topology/routes'));

// First-time stuff
reloadInstanceConfig();
topologyPeriodic.startPeriodicTasks();


if (devMode) {
  // serve developer, non-minified build
  const config = require('./webpack.config.js');
  const compiler = webpack(config);
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    contentBase: 'src',
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false,
    },
  });
  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
} else {
  // serve js from dist/ in prod mode
  app.get('/map.js', function (req, res) {
    res.sendFile(path.join(__dirname, '/dist/map.js'));
  });
  app.get('/bootstrap.css', function (req, res) {
    res.sendFile(path.join(__dirname, '/dist/bootstrap.css'));
  });
}

app.get(/\/*/, function (req, res) {
  res.render('index', {
    configJson: JSON.stringify(getNetworkInstanceConfig())
  });
});

app.listen(port, '', function onStart (err) {
  if (err) {
    console.log(err);
  }
  if (devMode) {
    console.log('<=========== DEVELOPER MODE ===========>');
  } else {
    console.log('<=========== PRODUCTION MODE ==========>');
    console.log('<== JS BUNDLE SERVED FROM /static/js ==>');
    console.log('<==== LOCAL CHANGES NOT POSSIBLE ======>');
  }
  console.log('\n=========> LISTENING ON PORT %s', port);
});
