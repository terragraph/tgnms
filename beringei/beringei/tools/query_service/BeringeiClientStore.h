/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <folly/Singleton.h>

#include <folly/Synchronized.h>
#include "beringei/client/BeringeiClient.h"
#include "beringei/client/BeringeiConfigurationAdapterIf.h"
#include "beringei/plugins/BeringeiConfigurationAdapter.h"

namespace facebook {
namespace gorilla {

class BeringeiClientStore {
 public:
  explicit BeringeiClientStore();

  static std::shared_ptr<BeringeiClientStore> getInstance();

  std::shared_ptr<BeringeiClient> getReadClient(int32_t intervalSec);
  std::shared_ptr<BeringeiClient> getWriteClient(int32_t intervalSec);

 private:
  folly::Synchronized<std::unordered_map<
      int32_t /* interval */,
      std::shared_ptr<BeringeiClient>>>
      readClients_;
  folly::Synchronized<std::unordered_map<
      int32_t /* interval */,
      std::shared_ptr<BeringeiClient>>>
      writeClients_;
};

} // namespace gorilla
} // namespace facebook
