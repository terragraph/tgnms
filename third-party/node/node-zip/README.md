node-zip
========

This is a native node addon designed to run Node.js while consuming modules
located in ZIP archives.

Building / Deployment
---------------------

Since we have no good path of building native code while running Buck *without*
causing platform-specific rule keys for all build artifacts using such code, the
extension has to be checked in.

Build the extension on both Mac and Linux:

```
# MAC
buck build xplat/third-party/node/node-zip:node-zipAppleMac#macosx-x86_64,mach-o-bundle --out xplat/third-party/node/node-zip/darwin-x64/zip.node

# LINUX
buck build @fbsource//fbcode/mode/opt xplat/third-party/node/node-zip:node-zip#platform007-clang,shared --out xplat/third-party/node/node-zip/linux-x64/zip.node
```
