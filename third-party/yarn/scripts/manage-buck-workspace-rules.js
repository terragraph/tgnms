#!/usr/bin/env node

// Copyright 2004-present Facebook. All Rights Reserved.
// @flow

'use strict';

/*::
type WorkspaceInfo = {
  location: string,
  workspaceDependencies: $ReadOnlyArray<string>,
  mismatchedWorkspaceDependencies: $ReadOnlyArray<string>,
}

type WorkspacesInfo = {[name: string]: WorkspaceInfo};

type Workspaces = $ReadOnlyArray<{info: WorkspaceInfo, name: string}>;

type WorkspaceRule =
  | 'yarn_workspace'
  | 'yarn_workspace_binary'
  | 'yarn_workspace_root';

type BinaryTarget = {|
  main: string,
  reuse: null | BuckTarget,
  root: BuckTarget,
  target: BuckTarget,
|};

type ExistingTargets = {|
  binaryTargets: Array<BinaryTarget>,
  rootTarget: BuckTarget,
  workspaceTargets: BuckTargetBaseMap<BuckTarget>,
|};
*/

const invariant = require('assert');
const fs = require('fs');
const path = require('path');

const {StringDecoder} = require('string_decoder');
const {spawnSync} = require('child_process');

const YARN_DEFS = '@fbsource//tools/build_defs/third_party:yarn_defs.bzl';

const BUILDOZER = path.resolve(
  __dirname,
  '../../../../tools/third-party/buildifier/run_buildozer.sh',
);
const BUILDIFIER = path.resolve(
  __dirname,
  '../../../../tools/third-party/buildifier/run_buildifier.py',
);
const BUILDOZER_READ_COMMANDS_FROM_STDIN = ['-f', '-'];
const MISSING = '(missing)';
const WORKSPACE_EXCLUDES = [
  '**/__fixtures__/**',
  '**/__flowtests__/**',
  '**/__mocks__/**',
  '**/__server_snapshot_tests__/**',
  '**/__tests__/**',
  '**/node_modules/**',
  '**/node_modules/.bin/**',
  '**/.*',
  '**/.*/**',
  '**/.*/.*',
  '**/*.xcodeproj/**',
  '**/*.xcworkspace/**',
];
const WORKSPACE_SRCS = `glob(["**/*.js"],exclude=${JSON.stringify(
  WORKSPACE_EXCLUDES,
)})`;

async function main(root, stdin, argv) {
  let inStream;
  const buildFileName =
    argv[0] === '--build-file' ? argv.splice(0, 2)[1] : 'BUCK';

  if (stdin.isTTY) {
    invariant(argv[0] != null, 'Needs data on stdin or as file.');
    inStream = fs.createReadStream(argv[0]);
  } else {
    inStream = stdin;
  }

  manage(root, await readInput(inStream), buildFileName);
}

function readInput(stream) {
  const decoder = new StringDecoder('utf8');
  let json = '';
  return new Promise((resolve, reject) =>
    stream
      .on('data', chunk => (json += decoder.write(chunk)))
      .on('end', () => resolve(JSON.parse(json + decoder.end())))
      .on('error', reject),
  );
}

function manage(
  root /*: string */,
  defs /*: WorkspacesInfo */,
  buildFileName /*: string */,
) {
  createBuckFileIfMissing(root, buildFileName);

  // relative path from buck (cell) root to the current path
  const workspaceRootBase = getTargetBase(root);
  const workspaceBases /*: Map<string, BuckTargetBase> */ = new Map();
  const queries = new BuildozerQueries();
  queries.queryForTypes(
    workspaceRootBase,
    'yarn_workspace_root',
    'yarn_workspace_binary',
  );
  for (const workspaceName in defs) {
    const {location} = defs[workspaceName];

    // buck path for the workspace
    const workspaceBase = workspaceRootBase.concat(location);
    workspaceBases.set(workspaceName, workspaceBase);
    queries.queryForTypes(
      workspaceBase,
      'yarn_workspace',
      'yarn_workspace_binary',
    );
    createBuckFileIfMissing(path.join(root, location), buildFileName);
  }

  let {binaryTargets, rootTarget, workspaceTargets} = findExistingTargets(
    queries,
    workspaceRootBase.cell,
  );

  const buildozerCommands = new BuildozerCommands();
  if (rootTarget == null) {
    // yarn_workspace_root does not exist yet -- create it.
    rootTarget = buildozerCommands.newRule(
      'yarn_workspace_root',
      workspaceRootBase,
    );
    buildozerCommands.visibilityPublic(rootTarget);
  }
  for (const [name, base] of workspaceBases.entries()) {
    if (!workspaceTargets.has(base)) {
      const target = buildozerCommands.newRule('yarn_workspace', base);
      workspaceTargets.set(base, target);
      buildozerCommands.defaultSrcs(target).visibilityPublic(target);
    }
  }
  buildozerCommands.deps(rootTarget, workspaceTargets.values());

  const workspaceDeps = new WorkspaceDeps(
    map(workspaceBases.entries(), ([workspaceName, workspaceTargetBase]) => {
      const workspaceTarget = nullthrows(
        workspaceTargets.get(workspaceTargetBase),
      );
      return [
        workspaceTarget,
        new Set(
          defs[workspaceName].workspaceDependencies
            .map(depName => nullthrows(workspaceBases.get(depName)))
            .map((depBase /*: BuckTargetBase */) =>
              nullthrows(workspaceTargets.get(depBase)),
            ),
        ),
      ];
    }),
  );

  const workspaceBinariesByDeps /*: DepsMap<BuckTarget> */ = new DepsMap();
  // Binaries that already reuse others go last, otherwise sort alphabetically
  binaryTargets.sort((a, b) => {
    return a.reuse === b.reuse
      ? BuckTarget.compare(a.target, b.target)
      : a.reuse != null
      ? 1
      : -1;
  });

  binaryTargets.forEach(({main, reuse, target}) => {
    if (!/^[[(].*[)\])]$/.test(main)) {
      return;
    }

    const mainWorkspace = target.resolve(main.slice(1, -1).split(' ')[0]);

    const deps = [mainWorkspace, ...workspaceDeps.transitive(mainWorkspace)];
    const serializedDeps = JSON.stringify(
      deps.map(t => t.fullyQualified()).sort(),
    );
    const existing = workspaceBinariesByDeps.get(deps);

    if (existing) {
      // another binary already uses the same set of deps, reuse its build.
      buildozerCommands.reuse(target, existing).deleteDeps(target);
    } else {
      // no other binary with the same dependencies, use `deps`.
      workspaceBinariesByDeps.set(deps, target);
      buildozerCommands.deps(target, deps).deleteReuse(target);
    }
  });

  // run commands that create targets first, this seems to be a problem with
  // buildozer, where a `set` can run before a `new`
  const newCommands = [];
  const otherCommands = [];
  for (const command of buildozerCommands.commands) {
    if (/^new(?:_load)?\b/.test(command)) {
      newCommands.push(command);
    } else {
      otherCommands.push(command);
    }
  }

  buildozer(BUILDOZER_READ_COMMANDS_FROM_STDIN, newCommands.join('\n'));
  buildozer(BUILDOZER_READ_COMMANDS_FROM_STDIN, otherCommands.join('\n'));
}

function getTargetBase(dir) {
  let last;
  let current = dir;
  do {
    const buckConfigFile = path.join(current, '.buckconfig');
    if (fs.existsSync(buckConfigFile)) {
      const targetBase = path.relative(current, dir);
      const cell = guessCell(buckConfigFile, targetBase);
      return new BuckTargetBase(cell, targetBase);
    }
    last = current;
    current = path.dirname(current);
  } while (last !== current);
  throw new Error('Not part of a Buck project: ' + dir);
}

function createBuckFileIfMissing(dir, name) {
  const buckFilePath = path.join(dir, name);
  if (!fs.existsSync(buckFilePath)) {
    fs.writeFileSync(buckFilePath, '');
  }
}

// Turn a main field into an array
function splitMainFields(main /*: string */) /*: Array<string> */ {
  main = main.trim();

  if (main[0] === '(') {
    // eg. ("fbsource//xplat/js/graphql/graphql-data:yarn-workspace","android-buckworker-bootload.js",)
    return main.slice(1, -1).split(',').filter(Boolean);
  } else {
    return main;
  }
}

function findExistingTargets(
  queries /*: BuildozerQueries */,
  cell /*: BuckCell */,
) /*: ExistingTargets */ {
  let rootTarget;
  const workspaceTargets = new BuckTargetBaseMap();
  const binaryTargets /*: Array<BinaryTarget> */ = [];
  buildozer(['print kind label root reuse archive main', ...queries.queries])
    .forEach(typeAndTarget => {
      const buildozerResults = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)/.exec(
        typeAndTarget,
      );
      invariant(buildozerResults != null, 'Invalid buildozer result ' + JSON.stringify(typeAndTarget));
      const [, type, targetStr, root, reuse, archive, main] = buildozerResults;
      const target = BuckTarget.parse(targetStr, cell);
      const {base} = target;
      if (type === 'yarn_workspace_root') {
        invariant(
          rootTarget === undefined,
          `Found more than one \`yarn_workspace_root\` rule in ${base.fullyQualified()}`,
        );
        rootTarget = target;
      } else if (type === 'yarn_workspace') {
        invariant(
          !workspaceTargets.has(base),
          `Found more than one \`yarn_workspace\` rule in ${base.fullyQualified()}`,
        );
        workspaceTargets.set(base, target);
      } else if (type === 'yarn_workspace_binary' && archive === MISSING) {
        const mains = splitMainFields(main);
        for (const main of mains) {
          binaryTargets.push({
            main,
            reuse: reuse === MISSING ? null : target.resolve(reuse),
            root: target.resolve(root),
            target,
          });
        }
      }
    });

  invariant(rootTarget != null, 'Did not find a `yarn_workspace_root` target');

  return {
    binaryTargets: binaryTargets.filter(t => rootTarget.equals(t.root)),
    rootTarget,
    workspaceTargets,
  };
}

function* map /*:: <T, U> */(
  xs /*: Iterable<T> */,
  callback /*: T => U */,
) /*: Iterable<U> */ {
  for (const x of xs) {
    yield callback(x);
  }
}

function* flatten(xs) {
  for (const x of xs) {
    yield* x;
  }
}

function fullyQualified(target, base) {
  if (!target.startsWith(':')) {
    return target;
  }

  return base.replace(/:.*/, `${target[0] === ':' ? '' : ':'}${target}`);
}

function buildozer(args, commands) {
  const result = spawnSync(BUILDOZER, args, {
    encoding: 'utf8',
    input: commands,
    cwd: path.resolve(__dirname, '..', '..', '..', '..'),
  });

  if (result.status !== 0 && result.status !== 3) {
    throw new Error(
      `Command \`${BUILDOZER} ${args.join(' ')}\` failed with ${String(
        result.stderr,
      )}. STDIN:\n${commands || ''}\n\nSTDERR:\n${String(result.stderr)}`,
    );
  } else if (result.error != null) {
    throw result.error;
  }

  // Buildozer may return lines that are split with indentation, so we need to collapse these indented lines
  // See https://fb.workplace.com/groups/frontendsupport/permalink/2762498210432271/ for more context
  const rawLines = String(result.stdout.trim()).split(/\r?\n/g);
  const parsedLines = [];

  function flushBuffer() {
    if (buffer.length > 0) {
      parsedLines.push(buffer.join(''));
      buffer = [];
    }
  }

  // Loop over the raw lines, collapsing indented lines
  let buffer = [];
  let wasLastLineIdented = false;
  for (const line of rawLines) {
    const trimmed = line.trim();
    const isIdented = trimmed !== line;

    // Ignore empty lines
    if (line === '') {
      continue;
    }

    // If the buffer isn't empty and we aren't indented, we should flush the buffer
    if (buffer.length > 0 && !isIdented) {
      flushBuffer();
    }

    if (!isIdented && wasLastLineIdented) {
      // If the last line was indented, then this line should have closed it
      parsedLines[parsedLines.length - 1] += trimmed;
      wasLastLineIdented = false;
    } else {
      // Push the current line onto the buffer
      buffer.push(trimmed);
      wasLastLineIdented = isIdented;
    }
  }

  // Flush the buffer
  flushBuffer();

  return parsedLines;
}

const RE_CELL_CONFIG = /^\s*\[repositories\]\s*(?:\n.*=.*)*\n\s*(\w+)\s*=\s*\.\s*$/m;

function guessCell(buckConfigFile, targetBase) {
  const buckConfig = fs.readFileSync(buckConfigFile, 'utf8');
  const matches = RE_CELL_CONFIG.exec(buckConfig);
  const cell = matches ? matches[1].split(/\n\s+/).filter(Boolean)[0] : null;
  invariant(
    cell,
    `Could not detect cell for buck config file ${buckConfigFile}`,
  );

  return new BuckCell(cell);
}

function stripCell(target) {
  const match = /^(?:\w*)([/][/].*)/.exec(target);
  invariant(match, 'Invalid target ' + JSON.stringify(target));
  return match[0];
}

class BuckCell {
  /*::
  name: string;
  */

  constructor(name /*: string */) {
    this.name = name;
  }

  equals(other /*: $ReadOnly<BuckCell> */) {
    return this.name === other.name;
  }
}

class BuckTargetBase {
  /*::
  cell: BuckCell;
  _basePath: string;
  */

  constructor(cell /*: BuckCell */, baseName /*: string */) {
    this.cell = cell;
    this._basePath = baseName;
  }

  concat(path /*: string */) /*: BuckTargetBase */ {
    return path
      ? new BuckTargetBase(this.cell, `${this._basePath}/${path}`)
      : this;
  }

  file(baseName /*: string */) /*: string */ {
    return `${this._basePath}/${baseName}`;
  }

  resolve(targetString /*: string */) /*: BuckTarget */ {
    if (/^\w*[/][/]/.test(targetString)) {
      return BuckTarget.parse(targetString, this.cell);
    }
    if (targetString.startsWith(':')) {
      return this.target(targetString.slice(1));
    }
    throw new Error(
      `Neither a fully qualified target nor a local target: ${targetString}`,
    );
  }

  target(name /*: string */) /*: BuckTarget */ {
    return new BuckTarget(this, name);
  }

  fullyQualified() {
    return (this.cell.name === 'xplat' ? this.cell.name : '') + this.withoutCell();
  }

  withoutCell() {
    return `//${this._basePath}`;
  }

  equals(other /*: $ReadOnly<BuckTargetBase> */) {
    return (
      this === other ||
      (this._basePath === other._basePath && this.cell.equals(other.cell))
    );
  }

  static parse(
    targetBaseString /*: string */,
    defaultCell /*: BuckCell */,
  ) /*: BuckTargetBase */ {
    const [cell, base] = targetBaseString.split(/[/][/](.*)/).slice(0, -1);
    return new BuckTargetBase(cell ? new BuckCell(cell) : defaultCell, base);
  }
}

class BuckTarget {
  /*::
  base: BuckTargetBase;
  _name: string;
  */

  constructor(base /*: BuckTargetBase */, name /*: string */) {
    this.base = base;
    this._name = name;
  }

  isCellLocal() {
    return this._name.startsWith('//');
  }

  resolve(targetString /*: string */) /*: BuckTarget */ {
    return this.base.resolve(targetString);
  }

  fullyQualified() {
    return `${this.base.fullyQualified()}:${this._name}`;
  }

  withoutCell() {
    return `${this.base.withoutCell()}:${this._name}`;
  }

  equals(other /*: $ReadOnly<BuckTarget> */) {
    return (
      this === other ||
      (this._name == other._name && this.base.equals(other.base))
    );
  }

  static compare(a /*: BuckTarget */, b /*: BuckTarget */) /*: -1|0|1 */ {
    const aa = a.fullyQualified(),
      bb = b.fullyQualified();
    return aa > bb ? 1 : bb > aa ? -1 : 0;
  }

  static parse(
    targetString /*: string */,
    defaultCell /*: BuckCell */,
  ) /*: BuckTarget */ {
    const [base, name] = targetString.split(/:(.*)/).slice(0, -1);
    return new BuckTarget(BuckTargetBase.parse(base, defaultCell), name);
  }
}

class ValueTypeKeyMap /*:: <K, V> */ {
  /*::
  _toPrimitive: K => number | string;
  _map: Map<number | string, V>;
  */

  constructor(
    toPrimitive /*: K => number | string */,
    values /*: ?Iterable<[K, V]> */,
  ) {
    this._toPrimitive = toPrimitive;
    this._map = new Map(map(values || [], ([k, v]) => [toPrimitive(k), v]));
  }

  get(key /*: K */) /*: void | V */ {
    return this._map.get(this._toPrimitive(key));
  }

  has(key /*: K */) {
    return this._map.get(this._toPrimitive(key));
  }

  set(key /*: K */, value /*: V */) /*: ValueTypeKeyMap<K, V> */ {
    this._map.set(this._toPrimitive(key), value);
    return this;
  }

  values() /*: Iterator<V> */ {
    return this._map.values();
  }
}

class BuckTargetMap /*:: <T> */ extends ValueTypeKeyMap /*:: <BuckTarget, T> */ {
  constructor(values /*: ?Iterable<[BuckTarget, T]> */) {
    super(x => x.fullyQualified(), values);
  }
}

class BuckTargetBaseMap /*:: <T> */ extends ValueTypeKeyMap /*:: <BuckTargetBase, T> */ {
  constructor() {
    super(x => x.fullyQualified());
  }
}

class DepsMap /*:: <T> */ extends ValueTypeKeyMap /*:: <$ReadOnlyArray<BuckTarget>, T> */ {
  constructor() {
    super(x => JSON.stringify([...x].sort()));
  }
}

class WorkspaceDeps {
  /*::
  _deps: BuckTargetMap<$ReadOnlySet<BuckTarget>>;
  _transitiveDeps: BuckTargetMap<Iterable<BuckTarget>>;
  */

  constructor(values /*: Iterable<[BuckTarget, $ReadOnlySet<BuckTarget>]> */) {
    this._deps = new BuckTargetMap(values);
    this._transitiveDeps = new BuckTargetMap();
  }

  shallow(workspace /*: BuckTarget */) /*: $ReadOnlySet<BuckTarget> */ {
    const deps = this._deps.get(workspace);
    return deps || new Set();
  }

  _guardedTransitive(
    workspace /*BuckTarget*/,
    collected /*: BuckTargetMap<$ReadOnlySet<BuckTarget>> */,
  ) /*: BuckTargetMap<$ReadOnlySet<BuckTarget>> */ {
    // guards against circular dependencies between workspaces, as used e.g. by metro
    if (!collected.has(workspace)) {
      const deps = this.shallow(workspace);
      collected.set(workspace, deps);
      for (const dep of deps) {
        this._guardedTransitive(dep, collected);
      }
    }

    return collected;
  }

  transitive(workspace /*BuckTarget*/) /*: $ReadOnlySet<BuckTarget> */ {
    const flattened = flatten(
      this._guardedTransitive(workspace, new BuckTargetMap()).values(),
    );
    return new Set(flattened);
  }
}

class BuildozerCommands {
  /*::
  commands: Array<string>
  */

  constructor() {
    this.commands = [];
  }

  newRule(
    type /*: WorkspaceRule */,
    basePath /*: BuckTargetBase */,
  ) /*: BuckTarget */ {
    const name = type.replace(/_/g, '-');
    const buildFile = basePath.file('BUILD');
    this.commands.push(
      `new_load ${YARN_DEFS} ${type}|${buildFile}`,
      `new ${type} ${name}|${buildFile}`,
    );
    return new BuckTarget(basePath, name);
  }

  _attr(attr /*: string */, target /*: BuckTarget */, value /*: string */) {
    const command = `set ${attr} ${value}|${target.withoutCell()}`;
    this.commands.push(command);
    return this;
  }

  _deleteAttr(attr /*: string */, target /*: BuckTarget */) {
    this.commands.push(`remove ${attr}|${target.withoutCell()}`);
    return this;
  }

  defaultSrcs(target /*: BuckTarget */) {
    return this._attr('srcs', target, WORKSPACE_SRCS);
  }

  deps(target /*: BuckTarget */, deps /*: Iterable<BuckTarget> */) {
    const sortedDeps = [...map(deps, t => t.fullyQualified())].sort().join(' ');
    return this._attr('deps', target, sortedDeps);
  }

  reuse(target /*: BuckTarget */, reuseTarget /*: BuckTarget */) {
    return this._attr(
      'reuse',
      target,
      JSON.stringify(reuseTarget.fullyQualified()),
    );
  }

  visibilityPublic(target /*: BuckTarget */) {
    return this._attr('visibility', target, 'PUBLIC');
  }

  deleteDeps(target /*: BuckTarget */) {
    return this._deleteAttr('deps', target);
  }

  deleteReuse(target /*: BuckTarget */) {
    return this._deleteAttr('reuse', target);
  }
}

function nullthrows /*:: <T> */(x /*: ?T */) /*: T */ {
  invariant(x != null, 'unexpected null');
  return x;
}

class BuildozerQueries {
  /*::
  queries: Array<string>;
  */
  constructor() {
    this.queries = [];
  }

  queryForTypes(
    targetBase /*: BuckTargetBase */,
    ...types /*: $ReadOnlyArray<WorkspaceRule> */
  ) {
    const queries = types.map(t => `${targetBase.withoutCell()}:%${t}`);
    this.queries.push(...queries);
  }
}

if (require.main === module) {
  main(process.cwd(), process.stdin, process.argv.slice(2)).catch(e =>
    process.nextTick(() => {
      throw e;
    }),
  );
}
