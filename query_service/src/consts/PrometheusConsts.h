/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <string>

namespace facebook {
namespace terragraph {
namespace stats {

class PrometheusConsts {
 public:
  // node labels
  const static std::string LABEL_NODE_MAC;
  const static std::string LABEL_NODE_NAME;
  const static std::string LABEL_NODE_IS_POP;
  const static std::string LABEL_NODE_IS_CN;
  const static std::string LABEL_RADIO_MAC;
  // site labels
  const static std::string LABEL_SITE_NAME;
  // link labels
  const static std::string LABEL_LINK_NAME;
  const static std::string LABEL_LINK_DIRECTION;
  // network labels
  const static std::string LABEL_NETWORK;
  // data interval
  const static std::string LABEL_DATA_INTERVAL;
  // metric format
  const static std::string METRIC_FORMAT;
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
