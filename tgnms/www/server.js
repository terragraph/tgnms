
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
  getAllTopologyNames,
  getConfigByName,
  getNetworkHealth,
  getNetworkInstanceConfig,
  getTopologyByName,
  reloadInstanceConfig,
} = require('./server/topology/model');
const {getAnalyzerData} = require('./server/topology/analyzer_data');
const topologyPeriodic = require('./server/topology/periodic');
const topologyTTypes = require('./thrift/gen-nodejs/Topology_types');
const express = require('express');
const fs = require('fs');
const isIp = require('is-ip');
const path = require('path');
const proxy = require('express-http-proxy');
const querystring = require('querystring');
const request = require('request');

const {
  NETWORK_CONFIG_NETWORKS_PATH,
  NETWORK_CONFIG_PATH,
} = require('./server/config');

// set up the upgrade images path
const NETWORK_UPGRADE_IMAGES_REL_PATH = '/static/tg-binaries';
const NETWORK_UPGRADE_IMAGES_FULL_PATH =
  process.cwd() + NETWORK_UPGRADE_IMAGES_REL_PATH;
if (!fs.existsSync(NETWORK_UPGRADE_IMAGES_FULL_PATH)) {
  fs.mkdirSync(NETWORK_UPGRADE_IMAGES_FULL_PATH);
}

// multer + configuration
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, NETWORK_UPGRADE_IMAGES_FULL_PATH);
  },
  // where to save the file on disk
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

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


var dashboards = {};
fs.readFile('./config/dashboards.json', 'utf-8', (err, data) => {
  if (!err) {
    dashboards = JSON.parse(data);
  }
});

app.post(/\/config\/save$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function (chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function () {
    if (!httpPostData.length) {
      return;
    }
    const configData = JSON.parse(httpPostData);
    if (configData && configData.topologies) {
      configData.topologies.forEach(config => {
        // if the topology file doesn't exist, write it
        // TODO - sanitize file name (serious)
        const topologyFile = path.join(
          NETWORK_CONFIG_NETWORKS_PATH,
          config.topology_file,
        );
        if (config.topology && !fs.existsSync(topologyFile)) {
          console.log(
            'Missing topology file for',
            config.topology.name,
            'writing to',
            topologyFile
          );
          fs.writeFile(
            topologyFile,
            JSON.stringify(config.topology, null, 4),
            function (err) {
              console.error(
                'Unable to write topology file',
                topologyFile,
                'error:',
                err
              );
            }
          );
        }
        // ensure we don't write the e2e topology to the instance config
        delete config.topology;
      });
    }

    // update mysql time series db
    const liveConfigFile = NETWORK_CONFIG_PATH;
    fs.writeFile(liveConfigFile, JSON.stringify(configData, null, 4), function (
      err
    ) {
      if (err) {
        res.status(500).end('Unable to save');
        console.log('Unable to save', err);
        return;
      }
      res.status(200).end('Saved');
      console.log('Saved instance config', NETWORK_CONFIG_PATH);
    });
  });
});

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


app.get(/\/health\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const networkHealth = getNetworkHealth(topologyName);
  if (networkHealth) {
    res.send(networkHealth).end();
  } else {
    console.log('No cache found for', topologyName);
    res.send('No cache').end();
  }
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

app.get(/\/topology\/list$/, function (req, res, next) {
  res.json(
    getAllTopologyNames().map(keyName => getTopologyByName(keyName)),
  );
});

app.get(/\/topology\/get\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const topology = getTopologyByName(topologyName);

  if (Object.keys(topology).length > 0) {
    res.json(topology);
    return;
  }
  res.status(404).end('No such topology\n');
});

app.get(/\/topology\/get_stateless\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  const networkConfig = Object.assign({}, getTopologyByName(topologyName));
  const topology = networkConfig.topology;
  if (topology) {
    // when config is downloaded we shouldn't show any status
    // injected by the running e2e controller
    if (topology.links) {
      topology.links.forEach(link => {
        delete link.linkup_attempts;
        link.is_alive = false;
      });
    }
    if (topology.nodes) {
      topology.nodes.forEach(node => {
        delete node.status_dump;
        // add missing parameters?
        if (!node.hasOwnProperty('ant_azimuth')) {
          node.ant_azimuth = 0;
        }
        if (!node.hasOwnProperty('ant_elevation')) {
          node.ant_elevation = 0;
        }
        node.status = 1;
        // delete node['polarity'];
      });
    }
    res.json(networkConfig);
    return;
  }
  res.status(404).end('No such topology\n');
});

app.get(/\/dashboards\/get\/(.+)$/i, function (req, res, next) {
  const topologyName = req.params[0];
  if (!dashboards[topologyName]) {
    dashboards[topologyName] = {};
  }
  res.json(dashboards[topologyName]);
});

app.post(/\/dashboards\/save\/$/i, function (req, res, next) {
  let httpPostData = '';
  req.on('data', function (chunk) {
    httpPostData += chunk.toString();
  });
  req.on('end', function () {
    if (!httpPostData.length) {
      return;
    }
    const data = JSON.parse(httpPostData);
    if (data.topologyName && data.dashboards) {
      dashboards[data.topologyName] = data.dashboards;
      fs.writeFile(
        './config/dashboards.json',
        JSON.stringify(dashboards, null, 4),
        function (err) {
          if (err) {
            res.status(500).end('Unable to save');
            console.log('Unable to save', err);
            return;
          }
          res.status(200).end('Saved');
        }
      );
    } else {
      res.status(500).end('Bad Data');
    }
  });
});

app.post(
  /\/controller\/uploadUpgradeBinary$/i,
  upload.single('binary'),
  function (req, res, next) {
    const urlPrefix = process.env.E2E_DL_URL ? process.env.E2E_DL_URL : (req.protocol + '://' + req.get('host'));
    const uriPath = querystring.escape(req.file.filename);
    const imageUrl = `${urlPrefix}${NETWORK_UPGRADE_IMAGES_REL_PATH}/${uriPath}`;

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      imageUrl,
    }));
  }
);

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

function getAPIServiceHost(req, res) {
  const topology = getConfigByName(req.params.topology);
  if (topology.apiservice_baseurl) {
    return topology.apiservice_baseurl;
  }
  const controller_ip = topology.controller_ip_active;
  return isIp.v6(controller_ip)
    ? 'http://[' + controller_ip + ']:8080'
    : 'http://' + controller_ip + ':8080';
}

app.use('/apiservice/:topology/',
  proxy(getAPIServiceHost, {
    memoizeHost: false,
    parseReqBody: false,
  }),
);

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
