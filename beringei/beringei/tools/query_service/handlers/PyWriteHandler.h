/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include "../MySqlClient.h"

#include <folly/Memory.h>
#include <folly/dynamic.h>
#include <folly/futures/Future.h>
#include <proxygen/httpserver/RequestHandler.h>

#include "beringei/client/BeringeiClient.h"
#include "beringei/client/BeringeiConfigurationAdapterIf.h"
#include "beringei/if/gen-cpp2/Topology_types_custom_protocol.h"
#include "beringei/if/gen-cpp2/beringei_query_types_custom_protocol.h"

namespace facebook {
namespace gorilla {
// PyReadHandler will handle time series sent from PyAnalytics and
// write to Beringei DB.
// The incoming data points are in http body.
// Current the destination need to be specified by Beringei DB metric Key ID.
// TODO: shard is not enabled and all data write to shard 0. Can implement via
//       common hash across languages.
class PyWriteHandler : public proxygen::RequestHandler {
 public:
  explicit PyWriteHandler(std::shared_ptr<MySqlClient> mySqlClient);

  void onRequest(
      std::unique_ptr<proxygen::HTTPMessage> headers) noexcept override;

  void onBody(std::unique_ptr<folly::IOBuf> body) noexcept override;

  void onEOM() noexcept override;

  void onUpgrade(proxygen::UpgradeProtocol proto) noexcept override;

  void requestComplete() noexcept override;

  void onError(proxygen::ProxygenError err) noexcept override;

 private:
  void logRequest(query::StatsWriteRequest request);

  void writeData(query::StatsWriteRequest request);

  // keep shared client holding key ids
  std::shared_ptr<MySqlClient> mySqlCacheClient_;
  // client per-thread for writing
  std::shared_ptr<MySqlClient> mySqlClient_;
  std::unique_ptr<folly::IOBuf> body_;
};
} // namespace gorilla
} // namespace facebook
