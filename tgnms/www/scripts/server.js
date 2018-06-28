
if (!process.env.NODE_ENV) {
  process.env.BABEL_ENV = 'development';
  process.env.NODE_ENV = 'development';
} else {
  process.env.BABEL_ENV = process.env.NODE_ENV;
}

const {
  getNetworkInstanceConfig,
  reloadInstanceConfig,
} = require('../server/topology/model');
const topologyPeriodic = require('../server/topology/periodic');

const compression = require('compression');
const express = require('express');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

const devMode = process.env.NODE_ENV !== 'production';
const port = devMode && process.env.PORT ? process.env.PORT : 80;

const app = express();

app.use(compression());

app.set('views', './views');
app.set('view engine', 'pug');

app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/apiservice', require('../server/apiservice/routes'));
app.use('/controller', require('../server/controller/routes'));
app.use('/map', require('../server/map/routes'));
app.use('/metrics', require('../server/metrics/routes'));
app.use('/dashboards', require('../server/dashboard/routes'));
app.use('/topology', require('../server/topology/routes'));

// First-time stuff
reloadInstanceConfig();
topologyPeriodic.startPeriodicTasks();

if (devMode) {
  // serve developer, non-minified build
  const config = require('../config/webpack.config.js');
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
  app.get('/map.js', (req, res) => {
    res.sendFile(path.join(__dirname, '/dist/map.js'));
  });
  app.get('/bootstrap.css', (req, res) => {
    res.sendFile(path.join(__dirname, '/dist/bootstrap.css'));
  });
}

app.get(/\/*/, (req, res) => {
  res.render('index', {
    configJson: JSON.stringify(getNetworkInstanceConfig()),
  });
});

app.listen(port, '', err => {
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
