/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

if (!process.env.NODE_ENV) {
  process.env.BABEL_ENV = 'development';
  process.env.NODE_ENV = 'development';
} else {
  process.env.BABEL_ENV = process.env.NODE_ENV;
}
require('../server/settings/settings').initialize();
const {LOGIN_ENABLED, SESSION_MAX_AGE_MS} = require('../server/config');

const bodyParser = require('body-parser');
const compression = require('compression');
const connectSession = require('connect-session-sequelize');
const cookieParser = require('cookie-parser');
const express = require('express');
const passport = require('passport');
const path = require('path');
const paths = require('@fbcnms/webpack-config/paths');
const session = require('express-session');
const staticDist = require('@fbcnms/webpack-config/staticDist').default;
const webpackSmartMiddleware = configureWebpackSmartMiddleware();
const {otpMiddleware} = require('../server/middleware/otp');
const {
  refreshTopologies,
  reloadInstanceConfig,
} = require('../server/topology/model');
const {buildUIConfig} = require('../server/ui/ui');
const {sequelize} = require('../server/models');
const topologyPeriodic = require('../server/topology/periodic');
const {runMigrations, runSeeders} = require('./initDatabase');
const {initializeNetworks} = require('./initNetworks');
const logger = require('../server/log')(module);
const access = require('../server/middleware/access').default;
const devMode = process.env.NODE_ENV !== 'production';
const port = process.env.PORT ? process.env.PORT : 80;
const sessionSecret = process.env.SESSION_TOKEN || 'TyfiBmZtxU';
const axiosSetup = require('../server/axiosSetup').default;
const {
  STARTUP_STEPS,
  makeStartupState,
  startupMiddleware,
} = require('../server/middleware/startup');
const {setupRoutes} = require('../server/setupRoutes');

const startupState = makeStartupState();
axiosSetup();
const app = express();

// Serve error pages if NMS fails to initialize
startupState.setStep(STARTUP_STEPS.START);
app.use(startupMiddleware(startupState));

if (process.env.WEBSOCKETS_ENABLED) {
  require('express-ws')(app);
}
app.listen(parseInt(port), '', err => {
  if (err) {
    logger.error(err.message);
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
    saveUninitialized: false,
    unset: 'destroy',
    rolling: true,
    cookie: {
      maxAge: configureSessionMaxAge(),
      httpOnly: true,
      sameSite: true,
    },
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
app.use(
  '/favicon.ico',
  express.static(path.join(__dirname, '..', 'static', 'images', 'favicon.ico')),
);
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

(async function main() {
  await setupRoutes(app);

  // First-time stuff
  topologyPeriodic.startPeriodicTasks();

  app.use(
    webpackSmartMiddleware({
      devMode,
      devWebpackConfig: require('../config/webpack.config.js'),
      distPath: paths.distPath,
    }),
  );

  // Catch All
  app.get('*', (req, res) => {
    const configObj = buildUIConfig(req);
    res.render('index', {
      staticDist: staticDist,
      configJson: JSON.stringify(configObj),
    });
  });

  // loop and wait for a database connection
  startupState.setStep(STARTUP_STEPS.DATABASE_CONFIGURE);
  for (;;) {
    try {
      logger.debug('Attempting database connection');
      await sequelize.authenticate();
      break;
    } catch (error) {
      startupState.errorMessage = makeDBErrorMessage(error);
      logger.error('NMS could not connect to database', error);
      // if connecting to the database fails, wait 2 seconds before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  try {
    // Run DB migrations
    await runMigrations();
  } catch (error) {
    logger.error('Unable to run migrations:', error);
    process.exit(1);
  }

  try {
    // Seed initial data
    await runSeeders();
  } catch (error) {
    logger.error('Unable to run seeds:', error);
  }
  startupState.setStep(STARTUP_STEPS.DATABASE_READY);
  try {
    // Provision networks from a file
    await initializeNetworks();
  } catch (error) {
    logger.error('Unable to run network provisioning:', error);
  }

  try {
    // Load network list
    await reloadInstanceConfig();
    // Refresh all topologies
    await refreshTopologies();
  } catch (error) {
    logger.error(`Unable to load initial network list:${error?.message}`);
  }

  // NMS is completely started
  startupState.setStep(STARTUP_STEPS.DONE);
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
    LOG_LEVEL: (process.env.LOG_LEVEL: any) || 'info',
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

function makeDBErrorMessage(error: Error) {
  const {config} = (sequelize: any);
  const connString = [
    `MYSQL_HOST=${config.host}`,
    `MYSQL_USER=${config.username}`,
    'MYSQL_PASS=****',
    `MYSQL_PORT:${config.port}`,
  ].join(';');
  const errorMessage = `Cannot connect to database.<br/>${error.message}<br/> Credentials: ${connString}`;
  return errorMessage;
}
