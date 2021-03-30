# Node Toolchain

This folder contains various versions of the Node toolchain (which in practice
is a bundle of three executables: `node`, `npm`, and `npx`), wrapped via
DotSlash.

If you want to import a new toolchain, such as `v10.16.0`, then run the
following from this directory:

```
./create_node_toolchain.py --output ./v10.16.0-test v10.16.0
```

If, after testing, you are sure this is good to go, delete the `./v10.16.0-test`
folder and run the script again with the `--retain-forever` flag with the
final directory as the `--output`:

```
./create_node_toolchain.py --retain-forever --output ./v10.16.0 v10.16.0
```

This ensures we do not pollute our Everstore bucket with scratch builds.

Note that this should produce the following folder structure:

```
./v10.16.0/
├── node
├── node.bat
├── npm
├── npm.bat
├── npx
└── npx.bat
```

The `node`, `npm`, and `npx` files are DotSlash scripts that can be run
directly on Mac and Linux. The corresponding `.bat` files are wrapper scripts
for Windows because it is finicky about file extensions.

## Defending Against Version Proliferation

Although this makes it *possible* to check in innumerable versions of Node into
the repo, that is not the goal. There should always be a subfolder named
`current` that contains whatever the community-agreed-upon version of Node we
should be using is. (Just `cp -R` the version-specific folder over `current/`.
Note this is identical to how `xplat/rust/toolchain/` works.)

The idea is that everyone should be using `current/` unless they are blocked
for some reason and cannot move to `current/` right away with everyone else.
Ideally, this will help us limit the number of projects that pin themselves to
older versions of Node.
