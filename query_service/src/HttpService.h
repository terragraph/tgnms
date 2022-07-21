/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <gflags/gflags.h>

#include <pistache/endpoint.h>
#include <pistache/http.h>
#include <pistache/router.h>

namespace facebook {
namespace terragraph {
namespace stats {

// setup http service + routes using pistache.io
class HttpService {
 public:
  explicit HttpService(Pistache::Address addr, int threadCount);

  // initialize HTTP routes
  void initRoutes();

  // serve HTTP requests (blocking)
  void run();

  // send error message to response writer
  static void sendErrorResponse(
      Pistache::Http::ResponseWriter& response,
      const std::string& errorMsg);
 private:
  std::shared_ptr<Pistache::Http::Endpoint> httpEndpoint_;
  Pistache::Rest::Router router_;
  int threadCount_;
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
