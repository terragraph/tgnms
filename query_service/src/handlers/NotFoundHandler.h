/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <pistache/router.h>

namespace facebook {
namespace terragraph {
namespace stats {

// handler that replies with HTTP 200 OK. Used by grafana to test if datasource
// connection is working.
class NotFoundHandler {
 public:
  void static handleRequest(
      const Pistache::Rest::Request& request,
      Pistache::Http::ResponseWriter response);
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
