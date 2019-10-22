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
import {LOGIN_ENABLED, SESSION_MAX_AGE_MS} from '../server/config';

const bodyParser = require('body-parser');
const compression = require('compression');
const connectSession = require('connect-session-sequelize');
const cookieParser = require('cookie-parser');
const express = require('express');
const fs = require('fs');
const passport = require('passport');
const path = require('path');
const paths = require('fbcnms-webpack-config/paths');
const session = require('express-session');
const staticDist = require('fbcnms-webpack-config/staticDist').default;

const webpackSmartMiddleware = configureWebpackSmartMiddleware();
import {otpMiddleware} from '../server/middleware/otp';
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
import {i18nextInstance} from '../server/translations/service';

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
    maxAge: configureSessionMaxAge(),
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
// tg-binaries is an open route, protect it with otp middleware
app.use(
  '/static/tg-binaries',
  otpMiddleware(),
  express.static(path.join(__dirname, '..', 'static')),
);
app.use('/static', express.static(path.join(__dirname, '..', 'static')));
app.use('/api/v1', require('../server/api/v1/routes'));
app.use('/apiservice', require('../server/apiservice/routes'));
app.use('/controller', require('../server/controller/routes'));
app.use('/dashboards', require('../server/dashboard/routes'));
app.use('/docker', require('../server/docker/routes'));
app.use('/events', require('../server/events/routes'));
app.use('/export', require('../server/export/routes'));
app.use('/map', require('../server/map/routes'));
app.use('/metrics', require('../server/metrics/routes'));
app.use('/nodeupdateservice', require('../server/nodeupdateservice/routes'));
app.use('/topology', require('../server/topology/routes'));
app.use('/user', require('../server/user/routes'));
app.use('/network_test', require('../server/network_test/routes'));
app.use('/nodelogs', require('../server/nodelogs/routes'));
app.use('/translations', require('../server/translations/routes'));
app.use('/websockets', require('../server/websockets/routes'));
app.use('/mobileapp', require('../server/mobileapp/routes'));
app.use('/healthcheck', require('../server/healthcheck/routes'));

// First-time stuff
topologyPeriodic.startPeriodicTasks();

// Check if nodelogs directory exists
const {NODELOG_DIR, TRANSLATIONS_DEFAULT_LOCALE} = require('../server/config');
let NODELOGS_ENABLED = false;
try {
  NODELOGS_ENABLED = fs.statSync(NODELOG_DIR).isDirectory();
} catch (_err) {}
if (!NODELOGS_ENABLED) {
  logger.error(
    'Node logs directory not found! (NODELOG_DIR=' + NODELOG_DIR + ')',
  );
}

app.use(
  webpackSmartMiddleware({
    devMode,
    devWebpackConfig: require('../config/webpack.config.js'),
    distPath: paths.distPath,
  }),
);

// Catch All
app.get('*', (req, res) => {
  const requestedLanguage = i18nextInstance.services.languageDetector.detect(
    req,
    res,
  );
  // construct config JSON to inject
  const configObj = {
    env: {},
    i18n: {
      locale: requestedLanguage || TRANSLATIONS_DEFAULT_LOCALE,
      fallbackLocale: TRANSLATIONS_DEFAULT_LOCALE,
    },
    networks: getAllNetworkConfigs(),
    user: req.user,
    version: process.env.npm_package_version,
  };

  // define which env keys to add to config
  const envKeys = [
    'GRAFANA_URL',
    'MAPBOX_ACCESS_TOKEN',
    'ISSUES_URL',
    'NETWORKTEST_HOST',
    'LOGIN_ENABLED',
    'TILE_STYLE',
    'STATS_BACKEND',
    'COMMIT_DATE',
    'COMMIT_HASH',
    'NOTIFICATION_MENU_ENABLED',
    'SERVICE_AVAILABILITY_ENABLED',
    'SOFTWARE_PORTAL_URL',
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
  configObj.env.SAVE_MISSING_TRANSLATIONS = devMode;

  res.render('index', {
    staticDist: staticDist,
    configJson: JSON.stringify(configObj),
  });
});

(async function main() {
  // loop and wait for a database connection
  for (;;) {
    try {
      await sequelize.authenticate();
      break;
    } catch (error) {
      logger.error('NMS could not connect to database', error);
      // if connecting to the database fails, wait 2 seconds before retrying
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  try {
    // Run DB migrations
    await runMigrations();
    // Seed initial data
    await runSeeders();
  } catch (error) {
    logger.error('Unable to run migrations/seeds:', error);
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

  try {
    // Load network list
    await reloadInstanceConfig();
    // Refresh all topologies
    await refreshTopologies();
  } catch (error) {
    logger.error('Unable to load initial network list:', error);
  }
})();

function configureWebpackSmartMiddleware() {
  /*
   * webpackSmartMiddleware uses fbcnms/logging to output build logs. By default
   * fbcnms/logging will use json output format instead of shell, so build
   * output will be uncolored and hard to read. In order to change this
   * default, configure() needs to be called before webpackSmartMiddleware is
   * imported.
   */
  const fbcLog = require('@fbcnms/logging');
  fbcLog.configure({
    LOG_FORMAT: process.env.NODE_ENV === 'development' ? 'shell' : 'json',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  });
  const webpackSmartMiddleware = require('@fbcnms/express-middleware/webpackSmartMiddleware')
    .default;
  return webpackSmartMiddleware;
}

function configureSessionMaxAge() {
  // Custom max age takes precedence
  if (typeof SESSION_MAX_AGE_MS === 'number') {
    return SESSION_MAX_AGE_MS;
  }

  const DAY = 24 * 60 * 60 * 1000;
  /*
   * If login is enabled, delegate to Keycloak's access/refresh expiry.
   * We set the maxAge to a date far in the future because returning
   * null/undefined means that it's a "browser session",
   * and will end once the user's browser is closed.
   *
   */
  if (LOGIN_ENABLED) {
    return 365 * DAY; // 1 year
  }

  /*
   * If the user has not provided a custom age, and login is disabled, set it to
   * one day.
   */
  return DAY; // 1 day
}
