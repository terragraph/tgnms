/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

if (!process.env.NODE_ENV) {
  process.env.BABEL_ENV = 'development';
  process.env.NODE_ENV = 'development';
} else {
  process.env.BABEL_ENV = process.env.NODE_ENV;
}

const bodyParser = require('body-parser');
const compression = require('compression');
const connectSession = require('connect-session-sequelize');
const cookieParser = require('cookie-parser');
const express = require('express');
const fs = require('fs');
const passport = require('passport');
const path = require('path');
const session = require('express-session');
const webpack = require('webpack');
const staticDist = require('fbcnms-webpack-config/staticDist').default;

const {
  refreshTopologies,
  getAllNetworkConfigs,
  reloadInstanceConfig,
} = require('../server/topology/model');

const {sequelize} = require('../server/models');
const topologyPeriodic = require('../server/topology/periodic');
const {runMigrations, runSeeders} = require('./initDatabase');
const logger = require('../server/log')(module);

import access from '../server/middleware/access';

const devMode = process.env.NODE_ENV !== 'production';
const port = process.env.PORT ? process.env.PORT : 80;
const sessionSecret = process.env.SESSION_TOKEN || 'TyfiBmZtxU';

const app = express();
require('express-ws')(app);

app.use(bodyParser.json({limit: '1mb'})); // parse json
app.use(bodyParser.urlencoded({limit: '1mb', extended: false})); // parse application/x-www-form-urlencoded
app.use(cookieParser());
app.use(compression());

// Create Sequelize Store
const SequelizeStore = connectSession(session.Store);
const store = new SequelizeStore({db: sequelize});

app.use(
  session({
    // Used to sign the session cookie
    resave: false,
    secret: sessionSecret,
    saveUninitialized: true,
    unset: 'destroy',
    rolling: true,
    // should be <= the refresh token's timeout
    maxAge: 30 * 60 * 1000, // 30 minutes
    store,
  }),
);

// Create/Sync Sequelize Session Table
store.sync();

// Initialize Passport
require('../server/user/passportSetup');
app.use(passport.initialize());
app.use(passport.session());

// Views
app.set('views', './views');
app.set('view engine', 'pug');

// Routes
app.use(access());
app.use('/static', express.static(path.join(__dirname, '..', 'static')));
app.use('/apiservice', require('../server/apiservice/routes'));
app.use('/controller', require('../server/controller/routes'));
app.use('/dashboards', require('../server/dashboard/routes'));
app.use('/docker', require('../server/docker/routes'));
app.use('/events', require('../server/events/routes'));
app.use('/map', require('../server/map/routes'));
app.use('/metrics', require('../server/metrics/routes'));
app.use('/nodeupdateservice', require('../server/nodeupdateservice/routes'));
app.use('/topology', require('../server/topology/routes'));
app.use('/user', require('../server/user/routes'));
app.use('/network_test', require('../server/network_test/routes'));
app.use('/nodelogs', require('../server/nodelogs/routes'));

// First-time stuff
topologyPeriodic.startPeriodicTasks();

// Check if nodelogs directory exists
const {NODELOG_DIR} = require('../server/config');
let NODELOGS_ENABLED = false;
try {
  NODELOGS_ENABLED = fs.statSync(NODELOG_DIR).isDirectory();
} catch (_err) {}
if (!NODELOGS_ENABLED) {
  logger.error(
    'Node logs directory not found! (NODELOG_DIR=' + NODELOG_DIR + ')',
  );
}

if (devMode) {
  // serve developer, non-minified build
  const config = require('../config/webpack.config.js');
  const compiler = webpack(config);
  const webpackMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    contentBase: 'src',
    logger,
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
}

// Catch All
app.get('*', (req, res) => {
  // construct config JSON to inject
  const configObj = {...getAllNetworkConfigs(), env: {}, user: req.user};

  // define which env keys to add to config
  const envKeys = [
    'GRAFANA_URL',
    'MAPBOX_ACCESS_TOKEN',
    'V1_URL',
    'ISSUES_URL',
    'NETWORKTEST_HOST',
    'LOGIN_ENABLED',
    'TILE_STYLE',
    'STATS_BACKEND',
  ];
  // validate ENVs
  const validateEnv = (key, value) => {
    // verify tile style url format
    if (key === 'TILE_STYLE') {
      const tileStyleList = value.split(',');
      if (tileStyleList === 0) {
        logger.error('Tile style URL ENV invalid, using default tiles');
        return false;
      }
      let validStyleList = true;
      tileStyleList.forEach(tileStyle => {
        const tileNameAndStyle = tileStyle.split('=');
        if (tileNameAndStyle.length !== 2) {
          logger.error(
            'Invalid tile style: "' +
              tileStyle +
              '", expecting format <NAME>=<STYLE URL>',
          );
          validStyleList = false;
        }
      });
      return validStyleList;
    }
    return true;
  };
  envKeys.forEach(key => {
    if (process.env.hasOwnProperty(key) && validateEnv(key, process.env[key])) {
      configObj.env[key] = process.env[key];
    }
  });
  configObj.env.NODELOGS_ENABLED = NODELOGS_ENABLED;

  res.render('index', {
    staticDist: staticDist,
    configJson: JSON.stringify(configObj),
  });
});

(async function main() {
  try {
    // Run DB migrations
    await runMigrations();
    // Seed initial data
    await runSeeders();
  } catch (error) {
    logger.error('Unable to run migrations/seeds:', error);
  }
  try {
    // Load network list
    await reloadInstanceConfig();
    // Refresh all topologies
    await refreshTopologies();
  } catch (error) {
    logger.error('Unable to load initial network list:', error);
  }

  app.listen(port, '', err => {
    if (err) {
      logger.error(err);
    }
    if (devMode) {
      logger.info('<=========== DEVELOPER MODE ===========>');
    } else {
      logger.info('<=========== PRODUCTION MODE ==========>');
      logger.info('<== JS BUNDLE SERVED FROM /static/js ==>');
      logger.info('<==== LOCAL CHANGES NOT POSSIBLE ======>');
    }
    logger.info('=========> LISTENING ON PORT %s', port);
  });
})();
