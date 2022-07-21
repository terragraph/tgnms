/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <pistache/router.h>

namespace facebook {
namespace terragraph {
namespace stats {

// handler that replies with HTTP 200 OK. Used by grafana to test if datasource
// connection is working.
class LinkHealthHandler {
 public:
  void static handleRequest(
      const Pistache::Rest::Request& request,
      Pistache::Http::ResponseWriter response);
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
