/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @format
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const util = require('util');

//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------

let USERINFO = null;

try {
  USERINFO = os.userInfo();
} catch (error) {
  // Seems like os.userInfo can throw in some not-well understood circumstances
  // https://fb.facebook.com/groups/frontendsupport/permalink/2316831078332322/
  // (e.g., if the current UID has no entry in /etc/passwd)
  USERINFO = {
    uid: -1,
    gid: -1,
    username: 'unknown',
    homedir: '/tmp',
    shell: '/bin/false',
  };
}

const IS_WINDOWS = process.platform === 'win32';
const IS_DEVSERVER = /^dev/.test(process.env.HOSTNAME);
const IS_SANDCASTLE = /buildslave/i.test(__dirname) || !!process.env.SANDCASTLE;
const IS_EDEN = fs.existsSync(path.join(USERINFO.homedir, 'local', '.eden'));

const DEBUG = !!process.env.INSTALL_NODE_MODULES_DEBUG;

const YARN_FLAGS = process.argv.slice(2);
const YARN_ROOT = process.cwd();
const YARN_VERSION = path.join(__dirname, 'YARN_VERSION');

const VERSION = fs.readFileSync(YARN_VERSION, 'utf8').trim();

//------------------------------------------------------------------------------
// Actions
//------------------------------------------------------------------------------

const _scubaData = {int: {}, normal: {}};

function logScuba(key, value) {
  logDebug('scuba: "%s" => "%s"', key, value);
  if (typeof value === 'number') {
    _scubaData.int[key] = value;
  } else if (typeof value === 'string') {
    _scubaData.normal[key] = value;
  }
}

function sendScubaLog() {
  logDebug('send-log: started');
  // This may not be the "normal" devserver scribe_cat, see
  // https://our.intern.facebook.com/intern/wiki/Splunk_scribe_cat/
  const ret = spawnSync('scribe_cat', ['perfpipe_kpm_node_modules'], {
    input: JSON.stringify(_scubaData) + '\n',
  });
  // Scuba logging is not critical, just print errors to the console.
  if (ret.status !== 0) {
    logDebug('send-log: finished error');
    logDebug(
      'scribe_cat exited with code %s and error: %s',
      ret.status,
      ret.error,
    );
  } else {
    logDebug('send-log: finished successfully');
  }
}

function logDebug(...args) {
  if (DEBUG) {
    const ts = new Date().toISOString();
    const str = util.format(...args);
    console.error('install-node-modules.js[%s]:%s: %s', process.pid, ts, str);
  }
}

//------------------------------------------------------------------------------
// Actions
//------------------------------------------------------------------------------

logScuba('cwd', YARN_ROOT);
logScuba('is_debug', DEBUG ? 1 : 0);
logScuba('is_devserver', IS_DEVSERVER ? 1 : 0);
logScuba('is_eden', IS_EDEN ? 1 : 0);
logScuba('is_sandcastle', IS_SANDCASTLE ? 1 : 0);
logScuba('platform', process.platform);
logScuba('time', Math.round(Date.now() / 1000));
logScuba('home', USERINFO.homedir);
logScuba('user', USERINFO.username);
logScuba('yarn_version', VERSION);

module.exports = {
  USERINFO,

  IS_WINDOWS,
  IS_DEVSERVER,
  IS_SANDCASTLE,

  DEBUG,

  YARN_FLAGS,
  YARN_ROOT,
  YARN_VERSION,

  VERSION,

  logScuba,
  sendScubaLog,
  logDebug,
};
