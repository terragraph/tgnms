node
====

Upgrading node currently requires an additional step to ensure the
native modules are compatible with our internal environment.

To manually update, run

    patchelf --set-interpreter \
      /usr/local/fbcode/platform009/lib/ld-linux-x86-64.so.2 \
      third-party/node/bin/node-linux-x64

on the node binary
