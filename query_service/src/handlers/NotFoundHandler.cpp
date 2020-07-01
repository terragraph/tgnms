/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "NotFoundHandler.h"

namespace facebook {
namespace gorilla {

void NotFoundHandler::handleRequest(
    const Pistache::Rest::Request& request,
    Pistache::Http::ResponseWriter response) {
  response.send(Pistache::Http::Code::Not_Found);
}

} // namespace gorilla
} // namespace facebook
