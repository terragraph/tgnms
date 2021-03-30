node
====

Upgrading node currently requires an additional step to ensure the
native modules are compatible with our internal environment.

To manually update, run

    patchelf --set-interpreter \
      /usr/local/fbcode/platform007/lib/ld-linux-x86-64.so.2 \
      xplat/third-party/node/bin/node-linux-x64

on the binary downloaded by `js1 upgrade node`
