/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 * @format
 * @noflow
 */
'use strict';

// Ensure that all yarn.lock's in fbsource have all of their deps in the
// offline mirror and are properly synced with their respective package.json.
// This script invokes yarn directly instead of install-node-modules.js to
// avoid the mutex, and to reuse a pool of cache dirs.

const child_process = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../../../..');
const YARN_BIN = path.join(ROOT_DIR, 'xplat/third-party/yarn/yarn');

const IS_SANDCASTLE = /buildslave/i.test(__dirname) || !!process.env.SANDCASTLE;
const IS_EDEN = fs.existsSync(path.join(ROOT_DIR, '.eden', 'root'));

let onlyRoot;
let pretend = false;
let testRevision;

// First two args are node and yarn-valicate.js, rest are args for the script
process.argv.slice(2).forEach((arg, index) => {
  switch (arg) {
    case '-d':
      onlyRoot = process.argv[index + 3];
      break;
    case '-n':
      pretend = true;
      break;
    case '-r':
      testRevision = process.argv[index + 3];
      break;
  }
});

const CACHE_DIR =
  IS_SANDCASTLE && fs.existsSync('/data/sandcastle/temp')
    ? '/data/sandcastle/temp'
    : os.tmpdir();

// Keep in sync with: fbsource/tools/utd/migrated_nbtd_jobs/yarn_validation.td
const DEPENDENCY_PATTERNS = Object.entries({
  // yarn dependencies
  node: /^xplat\/third-party\/node\/bin\/.*$/,
  yarn: /^xplat\/third-party\/yarn\/(YARN_VERSION|install-node-modules|yarn|.+\\.js)$/,
  // yarn offline mirror
  yarnOfflineMirror: /^xplat\/third-party\/yarn\/offline-mirror\/.*$/,
  // yarn test itself
  yarnTest: /^xplat\/third-party\/yarn\/tests\/.*/,
  // package.json or yarn.lock
  packageJson: /^.*\/package\.json$/,
  yarnLock: /^.*\/yarn\.lock$/,
});

const EXCLUSION = fs
  .readFileSync(path.join(__dirname, 'exclusion'), 'utf8')
  .split('\n')
  .filter(Boolean);

console.log('Finding yarn roots...');
const yarnRoots = onlyRoot
  ? [onlyRoot]
  : child_process
      .execFileSync(
        'hg',
        [
          'files',
          '--include',
          '**/yarn.lock',
          ...EXCLUSION.reduce((acc, dir) => [...acc, '--exclude', dir], []),
        ],
        {
          cwd: ROOT_DIR,
          encoding: 'utf8',
        },
      )
      .trim()
      .split('\n')
      .reverse() // So we do the xplat stuff first, which is the biggest.
      .map(x => path.dirname(x));
console.log('Found %s yarn roots.', yarnRoots.length);

console.log('Querying hg for changes...');
const hgStatusResults = JSON.parse(
  child_process.execFileSync(
    'hg',
    [
      'status',
      '-mar', // Only ask for modified, added, and removed files.
      ...(testRevision
        ? ['--change', testRevision]
        : ['--rev', 'first(draft() & ::.)^']), // Ask for all draft changes.
      '-T',
      'json', // Speak my love language.
    ],
    {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    },
  ),
);

const changed = {
  node: [],
  yarn: [],
  yarnOfflineMirror: [],
  yarnTest: [],
  packageJson: [],
  yarnLock: [],
};
for (const hgStatusResult of hgStatusResults) {
  for (const [dependencyType, dependencyPattern] of DEPENDENCY_PATTERNS) {
    if (hgStatusResult.path.match(dependencyPattern)) {
      changed[dependencyType].push(hgStatusResult);
      break;
    }
  }
}

let yarnRootsToValidate = [];

if (
  changed.node.length > 0 ||
  changed.yarn.length > 0 ||
  changed.yarnTest.length > 0
) {
  console.log('Detected an infrastructure change; validating all roots.');
  yarnRootsToValidate = yarnRoots;
} else if (changed.yarnOfflineMirror.some(({status}) => status !== 'A')) {
  console.log(
    'An existing offline mirror archive was modified; validating all roots.',
  );
  yarnRootsToValidate = yarnRoots;
} else {
  // Consolidate all directory paths of changed package configurations.
  const changedRoots = Array.from(
    new Set([
      ...changed.packageJson.map(change => path.dirname(change.path)),
      ...changed.yarnLock.map(change => path.dirname(change.path)),
    ]),
  );
  // Filter `yarnRoots` to the ones that are either a changed root, ancestor of
  // a changed root, or descendant of a changed root.
  yarnRootsToValidate = yarnRoots.filter(yarnRoot =>
    changedRoots.some(
      changedRoot =>
        changedRoot.startsWith(yarnRoot) || yarnRoot.startsWith(changedRoot),
    ),
  );
  if (yarnRootsToValidate.length > 0) {
    console.log(
      'Detected changes to %d roots; validating them now.',
      yarnRootsToValidate.length,
    );
  } else {
    console.log('No relevant dependencies were modified; skipping validation.');
  }
}

if (pretend) {
  console.log('Stopping script because of -n flag (pretend).');
  if (yarnRootsToValidate.length > 0) {
    console.log('Would have validated the following roots:');
    for (const yarnRootToValidate of yarnRootsToValidate) {
      console.log(` - ${yarnRootToValidate}`);
    }
  }
} else if (yarnRootsToValidate.length > 0) {
  if (IS_EDEN && IS_SANDCASTLE) {
    console.log('Configuring Eden redirects for node_modules...');
    edenRedirect(
      yarnRootsToValidate.map(yarnRootToValidate =>
        path.join(yarnRootToValidate, 'node_modules'),
      ),
    );
  }

  // Clone array because it gets mutated as roots are validated.
  yarnValidate([...yarnRootsToValidate]);
}

/**
 * Eden is slow when dealing with ignored files within the checkout. Examples of
 * this include `buck-out` and `node_modules`. The workaround is to tell Eden
 * that those directories should be redirected to paths outside of the checkout.
 * This makes them fast.
 */
function edenRedirect(redirectPaths) {
  // Extra check, just to be safe.
  if (!IS_EDEN || !IS_SANDCASTLE) {
    throw new Error('Eden redirection should *only* be used on Sandcastle!');
  }
  for (const redirectPath of redirectPaths) {
    if (fs.existsSync(path.join(ROOT_DIR, redirectPath))) {
      continue;
    }
    child_process.execFileSync(
      'eden',
      ['redirect', 'add', redirectPath, 'bind'],
      {
        cwd: ROOT_DIR,
        encoding: 'utf8',
      },
    );
  }
}

function yarnValidate(remainingYarnRoots) {
  const failures = [];

  // Up-to 4 workers. We're IO bound, so it's faster to have fewer workers
  // sharing a cache, than lots of workers with empty caches.
  let workers = Math.max(Math.min(os.cpus().length, 4), 1);
  let waiting = remainingYarnRoots.length;

  // Workers can re-use cache dirs, but only one can be using it at a time.
  // So we'll have as many cache dirs as we have workers.
  const cacheDirPool = [...Array(workers)].map((_, i) =>
    path.join(
      CACHE_DIR,
      'yarn-validation',
      `${process.pid}-${i + 1}-${workers}`,
    ),
  );

  const yarnLockContents = new Map(
    remainingYarnRoots.map(relativeRoot => {
      const yarnLockFilename = path.join(ROOT_DIR, relativeRoot, 'yarn.lock');
      if (!fs.existsSync(yarnLockFilename)) {
        return [yarnLockFilename, null];
      } else {
        const yarnLockContent = fs.readFileSync(yarnLockFilename, 'utf8');
        return [yarnLockFilename, yarnLockContent];
      }
    }),
  );

  console.log('Starting check with %s concurrent installs.', workers);
  while (workers-- && remainingYarnRoots.length) {
    yarnInstallNext();
  }

  function yarnInstallNext() {
    const start = Date.now();
    const projectRoot = remainingYarnRoots.shift();
    const position = yarnRootsToValidate.length - remainingYarnRoots.length;
    const label = `[${position}, "${projectRoot}"]`;
    const yarnLockFilename = path.join(ROOT_DIR, projectRoot, 'yarn.lock');

    if (yarnLockContents.get(yarnLockFilename) == null) {
      console.log('>>> %s ignoring...', label);
      yarnProcessNextFile();
      return;
    } else {
      console.log('>>> %s checking...', label);
    }

    const cacheDir = cacheDirPool.pop();

    // Use yarn directly instead of install-node-modules.js to avoid the
    // mutex. Since there is no other yarn trying to install a given
    // project, this is safe.
    const ps = child_process.execFile(
      YARN_BIN,
      [
        'install',
        // Use offline mirror.
        '--offline',
        // Force overwriting the lockfile if there are changes.
        '--force',
        // Do not ever run postinstall hooks etc.
        '--ignore-scripts',
        // Do not complain about incompatible engines.
        '--ignore-engines',
        // Do not complain about incompatible platforms.
        '--ignore-platform',
        // Unique cache dir per worker so they don't trample over each other.
        '--cache-folder',
        cacheDir,
      ],
      {
        cwd: path.join(ROOT_DIR, projectRoot),
        encoding: 'utf8',
      },
      (err, stdout, stderr) => {
        cacheDirPool.push(cacheDir);
        if (err) {
          console.log('XXX %s failed check', label);
          failures.push({projectRoot, err, ps, stdout, stderr});
        } else {
          const oldYarnLock = yarnLockContents.get(yarnLockFilename);
          const newYarnLock = fs.readFileSync(yarnLockFilename, 'utf8');
          if (oldYarnLock !== newYarnLock) {
            console.log('XXX %s yarn.lock changed', label);
            failures.push({projectRoot, err, ps, stdout, stderr});
          }
        }
        const duration = Math.floor((Date.now() - start) / 1000);
        console.log('<<< %s finished in %ss', label, duration);
        yarnProcessNextFile();
      },
    );
  }

  function yarnProcessNextFile() {
    if (remainingYarnRoots.length) {
      yarnInstallNext();
    }
    if (--waiting === 0) {
      done();
    }
  }

  function done() {
    failures.forEach(failure => {
      const root = failure.projectRoot;
      console.log(
        [
          '-'.repeat(60),
          `!! Yarn validation failed for "${root}".`,
          '!! This means the package.json, yarn.lock, or offline-mirror disagree',
          '!! in some way. Try fixing it by running `yarn` (or `yarn --force`) ',
          '!! in that directory and committing the changes.',
          '!!',
          '!! You can test changes locally by running:',
          `!!   ~/fbsource/xplat/third-party/yarn/tests/yarn-validate -d ${root}`,
          '!!',
          '!! If this project should not be covered by this test, exclude it by',
          '!! adding it to "xplat/third-party/yarn/tests/exclusion".',
          '!!',
          '!! Support Group: https://fb.facebook.com/groups/rn.support/',
          '-'.repeat(60),
          `DIRECTORY: ${root}\n`,
          `COMMAND: ${failure.ps.spawnargs.join(' ')}\n`,
          `STDOUT:\n${failure.stdout}`,
          `STDERR:\n${failure.stderr}`,
          '*'.repeat(60),
        ].join('\n'),
      );
    });
    console.log('Total time: %ss', Math.floor(process.uptime()));
    if (failures.length) {
      process.exitCode = 1;
    }
  }
}
