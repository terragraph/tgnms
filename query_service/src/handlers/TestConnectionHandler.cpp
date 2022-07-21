/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "TestConnectionHandler.h"

namespace facebook {
namespace terragraph {
namespace stats {

void TestConnectionHandler::handleRequest(
    const Pistache::Rest::Request& request,
    Pistache::Http::ResponseWriter response) {
  response.send(Pistache::Http::Code::Ok);
}

} // namespace stats
} // namespace terragraph
} // namespace facebook
