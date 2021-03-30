/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @format
 */

//
// install-node-modules installs node_modules anywhere in fbsource into the
// current directory in a Sandcastle friendly way and logs results to scuba.
//
// Usage:
// install-node-modules [yarn options]
//
// Set INSTALL_NODE_MODULES_DEBUG=1 to enable debug printing.
//

'use strict';

if (require.main !== module) {
  throw new Error('install-node-modules.js must be run directly!');
}

const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn, spawnSync} = require('child_process');

const {
  USERINFO,
  IS_WINDOWS,
  IS_SANDCASTLE,
  DEBUG,
  YARN_FLAGS,
  YARN_ROOT,
  YARN_VERSION,
  VERSION,
} = require('./logging');
const {logScuba, sendScubaLog, logDebug} = require('./logging');

const WATCHMAN_RET = {
  NO_CHANGES: 'no_changes',
  CHANGES: 'changes',
  TIMEOUT: 'timeout',
  NO_CLOCK: 'no_clock',
  NO_CHECK: 'no_check',
  ERROR: 'error',
};

//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------

const INTEGRITY_VERSION = 0;

const INTEGRITY_FLAGS_HASH = JSON.stringify(
  [INTEGRITY_VERSION, '--flat', '--production']
    .filter(x => YARN_FLAGS.includes(x))
    .concat(process.version, VERSION),
);

const SANDCASTLE_TEMP_PATH = '/data/sandcastle/temp';
const TEMP_DIR =
  IS_SANDCASTLE && fs.existsSync(SANDCASTLE_TEMP_PATH)
    ? SANDCASTLE_TEMP_PATH
    : os.tmpdir();

const WATCH_FILE = path.join(
  TEMP_DIR,
  `yarn-${USERINFO.username}-${slashEscape(YARN_ROOT)}.watch`,
);

//------------------------------------------------------------------------------
// Utilities
//------------------------------------------------------------------------------

// From xplat/js/react-native-github/Libraries/vendor/core/guid.js
function guid() {
  return 'f' + (Math.random() * (1 << 30)).toString(16).replace('.', '');
}

// From https://github.com/zertosh/slash-escape/blob/e7ebb99/slash-escape.js
function slashEscape(str) {
  const ESCAPE_LOOKUP = {'\\': 'zB', ':': 'zC', '/': 'zS', z: 'zZ'};
  return str.replace(/[\\:\/z]/g, match => ESCAPE_LOOKUP[match]);
}

function spawnProcess(name, args) {
  return new Promise((resolve, reject) => {
    const stdout = [];
    const stderr = [];
    const subp = spawn(name, args);
    subp.stdout.on('data', data => {
      stdout.push(data);
    });
    subp.stderr.on('data', data => {
      stderr.push(data);
    });
    subp.on('close', status => {
      resolve({
        status,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        timeout: false,
      });
    });
    // Timeout
    setTimeout(() => {
      resolve(null);
    }, 2000).unref();
  });
}

//------------------------------------------------------------------------------
// Actions
//------------------------------------------------------------------------------

async function watchmanCheck() {
  if (
    YARN_FLAGS.includes('--force') ||
    !fs.existsSync(path.join(YARN_ROOT, 'node_modules'))
  ) {
    return WATCHMAN_RET.NO_CHECK;
  }

  logDebug('watch_file: %s', WATCH_FILE);

  if (!fs.existsSync(WATCH_FILE)) {
    logDebug('watchmanCheck could not find existing watch file');

    return WATCHMAN_RET.NO_CLOCK;
  }

  let saved;
  try {
    saved = JSON.parse(fs.readFileSync(WATCH_FILE));
  } catch (error) {
    return WATCHMAN_RET.ERROR;
  }

  logDebug('watchmanCheck read: %j', saved);

  if (saved.flagsHash !== INTEGRITY_FLAGS_HASH) {
    return WATCHMAN_RET.NO_CLOCK;
  }

  const start = Date.now();

  try {
    const ret = await spawnProcess('watchman', [
      '--no-pretty',
      'since',
      ...saved.since,
    ]);

    if (ret === null) {
      logDebug('watchmanCheck timeouted');

      return WATCHMAN_RET.TIMEOUT;
    }

    // Optimization: Avoid parsing JSON and running `indexOf` on huge responses.
    //
    // We only care about "no changes". When nothing has changed, the response
    // is small (92 chars). We can avoid an `indexOf` forced buffer decoding
    // (of a possibly +20M buffer) by using the buffer length as a heuristic
    // for whether `files` is populated or not.
    //
    // A "no changes" response looks like this:
    // {"version":"4.9.0","is_fresh_instance":false,"clock":"c:1507520862:6310:1:14441","files":[]}
    if (
      ret.status === 0 &&
      ret.stdout.length < 500 && // anything bigger must have changes
      ret.stdout.indexOf('"files":[]') !== -1
    ) {
      return WATCHMAN_RET.NO_CHANGES;
    } else {
      return WATCHMAN_RET.CHANGES;
    }
  } catch (err) {
    logDebug('watchmanCheck error: %s', err);

    return WATCHMAN_RET.ERROR;
  } finally {
    logScuba('watchman_time', Date.now() - start);
  }
}

function watchmanSave() {
  try {
    const retWatch = spawnSync('watchman', ['watch-project', YARN_ROOT]);
    const watchData = JSON.parse(retWatch.stdout);
    const retClock = spawnSync('watchman', ['clock', watchData.watch]);
    const clockData = JSON.parse(retClock.stdout);
    const watchRelativeYarnRoot = watchData.relative_path || '';
    const saved = {
      flagsHash: INTEGRITY_FLAGS_HASH,
      since: [
        watchData.watch,
        clockData.clock,
        path.posix.join(watchRelativeYarnRoot, 'node_modules/**'),
        path.posix.join(watchRelativeYarnRoot, 'package.json'),
        path.posix.join(watchRelativeYarnRoot, 'yarn.lock'),
      ],
    };
    const packageJsonPath = path.join(YARN_ROOT, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath));
    if (Array.isArray(pkgJson.workspaces)) {
      pkgJson.workspaces.forEach(workspace => {
        saved.since.push(
          path.posix.join(watchRelativeYarnRoot, workspace, 'node_modules/**'),
          path.posix.join(watchRelativeYarnRoot, workspace, 'package.json'),
        );
      });
    }
    logDebug('watchmanSave saved: %j', saved);
    fs.writeFileSync(WATCH_FILE, JSON.stringify(saved));
  } catch (err) {
    logDebug('watchmanSave error: %s', err);
  }
}

function computeScratchDir() {
  // Windows and sandcastle machines don't yet have a fully baked
  // configuration for the mkscratch tool
  if (IS_WINDOWS || IS_SANDCASTLE) {
    return TEMP_DIR;
  }

  const retScratch = spawnSync('mkscratch', [
    'path',
    '--subdir',
    'xplat/third-party/yarn/scratch',
    YARN_ROOT,
  ]);
  if (retScratch.error) {
    if (retScratch.error.errno == 'ENOENT') {
      throw new Error(
        'mkscratch was not found in your PATH.  This is most likely ' +
          "because chef isn't working on your system, or that you " +
          "have a custom shell setup that isn't pulling in the normal " +
          'FB rcfiles.  A number of tools in the development environment ' +
          'will be broken until you resolve the underlying issue.',
      );
    }
    throw retScratch.error;
  }
  return retScratch.stdout.toString('utf8').trim();
}

function yarnInstall() {
  logDebug('yarnInstall: started');

  if (!fs.existsSync('yarn.lock')) {
    throw new Error(`"${path.resolve('yarn.lock')}" not found.`);
  }

  const flags = [
    // Handle concurrent executions of this script.
    '--mutex',
    'network',
    // Makes yarn less verbose.
    '--silent',
    // Use offline mirror.
    '--offline',
    // Ensure lockfile is not updated and it is in sync with package.json
    '--frozen-lockfile',
    // Do not ever run postinstall hooks etc.
    '--ignore-scripts',
    // Merge passthrough flags.
    ...YARN_FLAGS,
  ];
  const scratchDir = computeScratchDir();

  flags.push('--cache-folder', path.join(scratchDir, 'cache-folder'));
  flags.push('--global-folder', path.join(scratchDir, 'global-folder'));
  flags.push('--link-folder', path.join(scratchDir, 'link-folder'));

  const yarnIntegrity = path.join(YARN_ROOT, 'node_modules/.yarn-integrity');
  const integrityTime1 = fs.existsSync(yarnIntegrity)
    ? fs.statSync(yarnIntegrity).mtime.getTime()
    : null;

  const startTime = Date.now();
  const installArgs = [path.join(__dirname, 'yarn'), 'install', ...flags];
  const retInstall = spawnSync(process.execPath, installArgs, {
    // Buck logs stderr but stdout needs to be free for Buck-Packager interface.
    stdio: DEBUG ? ['ignore', process.stderr, process.stderr] : null,
    // Normalize NODE_ENV. Use --production, if you want production.
    env: Object.assign({}, process.env, {NODE_ENV: 'development'}),
  });
  const endTime = Date.now();

  logDebug('exec: %s', installArgs.join(' '));

  logScuba('install_run_time', endTime - startTime);

  const retHg = spawnSync('hg', ['parent', '--template', '{node}']);
  if (retHg.status === 0) {
    logScuba('hg_hash', retHg.stdout.toString().trim());
  } else {
    logDebug('yarnInstall: hg parent failed %s %s', retHg.status, retHg.error);
  }

  if (retInstall.status !== 0) {
    if (fs.existsSync('yarn-error.log')) {
      const yarnErrorLog = fs.readFileSync('yarn-error.log', 'utf8');
      const allSections = yarnErrorLog.split(/^\n?(?=\w.+\n)/m);
      // Strip package.json and lockfile from error log to reduce noise.
      const usefulSections = allSections.filter(section => {
        return !(
          section.startsWith('Lockfile:') ||
          section.startsWith('yarn manifest:') ||
          section.startsWith('npm manifest:')
        );
      });
      logScuba('yarn_error_log', usefulSections.join('\n'));
    }
    console.error('in folder: %s', YARN_ROOT);
    console.error('yarn command failed: %s', installArgs.join(' '));
    console.error(String(retInstall.error).replace(/^/gm, '[yarn_error] '));
    if (!DEBUG) {
      console.error(String(retInstall.stdout).replace(/^/gm, '[yarn_stdout] '));
      console.error(String(retInstall.stderr).replace(/^/gm, '[yarn_stderr] '));
    }
    throw new Error(`yarn exited with code ${retInstall.status}`);
  }

  // Yarn can stop installation if hashes match but we can't know it from CLI
  // so we track mtime of integrity-hash file before and after installation.
  const installPerformed =
    integrityTime1 == null ||
    // We may have another yarn installation started right after ours was
    // finished so check for the integrity file existence again. We need a better
    // locking and logging system for this whole thing but until we implement
    // that we add this check to alleviate t27213044.
    !fs.existsSync(yarnIntegrity) ||
    integrityTime1 !== fs.statSync(yarnIntegrity).mtime.getTime();
  logScuba('install_performed', installPerformed ? 1 : 0);

  logDebug('yarnInstall: finished');
}

//------------------------------------------------------------------------------
// Main
//------------------------------------------------------------------------------

async function main() {
  try {
    // To link BUCK or --debug log with yarn scuba log.
    logScuba('installation_id', guid());
    const watchmanResult = await watchmanCheck();

    logScuba('watchman_result', watchmanResult);

    if (watchmanResult === WATCHMAN_RET.NO_CHANGES) {
      logScuba('watchman_check', 1);
    } else {
      logScuba('watchman_check', 0);

      yarnInstall();

      logScuba('success', 1);
    }

    switch (watchmanResult) {
      case WATCHMAN_RET.NO_CHECK:
        break;

      case WATCHMAN_RET.NO_CLOCK:
      case WATCHMAN_RET.NO_CHANGES:
      case WATCHMAN_RET.CHANGES:
        watchmanSave();
        break;

      // Delete the watch cached file if we received a
      // timeout from watchman (since timeout sometimes
      // are caused by very old cached clocks).
      case WATCHMAN_RET.TIMEOUT:
      case WATCHMAN_RET.ERROR:
        try {
          fs.unlinkSync(WATCH_FILE);
        } catch (error) {
          // ENOENT can arise because of race conditions (T39254912)
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
        break;
    }

    logDebug('install-node-modules EXIT SUCCESS');
  } catch (err) {
    process.exitCode = 1;
    console.error(err.stack);
    logScuba('last_error', err.stack);
    logScuba('success', 0);
    logDebug('install-node-modules EXIT ERROR');
  } finally {
    logScuba('run_time', process.uptime() * 1000);
    sendScubaLog();
    process.exit();
  }
}

main();
