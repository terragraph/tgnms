/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "PrometheusConsts.h"

namespace facebook {
namespace gorilla {

// node labels
const std::string PrometheusConsts::LABEL_NODE_MAC{"nodeMac"};
const std::string PrometheusConsts::LABEL_NODE_NAME{"nodeName"};
const std::string PrometheusConsts::LABEL_NODE_IS_POP{"pop"};
const std::string PrometheusConsts::LABEL_NODE_IS_CN{"cn"};
// site labels
const std::string PrometheusConsts::LABEL_SITE_NAME{"siteName"};
// link labels
const std::string PrometheusConsts::LABEL_LINK_NAME{"linkName"};
const std::string PrometheusConsts::LABEL_LINK_DIRECTION{"linkDirection"};
// data interval
const std::string PrometheusConsts::LABEL_DATA_INTERVAL{"intervalSec"};

} // namespace gorilla
} // namespace facebook
