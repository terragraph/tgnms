# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# package information
set(PACKAGE_NAME      "udp_pinger")
set(PACKAGE_VERSION   "1")
set(PACKAGE_STRING    "${PACKAGE_NAME} ${PACKAGE_VERSION}")
set(PACKAGE_TARNAME   "${PACKAGE_NAME}-${PACKAGE_VERSION}")

project(${PACKAGE_NAME} C CXX)

add_subdirectory(src)
