#!/bin/bash
/usr/local/bin/g++ -fPIC -shared -DHAVE_INTTYPES_H -DHAVE_NETINET_IN_H \
-std=c++14 -fvisibility-inlines-hidden -Wall -Wextra -Werror \
-Wno-unused-parameter -I. \
*.cpp -L/usr/local/lib \
-lthrift -lfolly -lglog -lzstd -lthriftprotocol -lthriftcpp2 \
-o libthriftctrl.so
