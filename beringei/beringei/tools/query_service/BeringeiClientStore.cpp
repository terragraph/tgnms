/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "BeringeiClientStore.h"

DEFINE_int32(writer_queue_size, 100000, "Beringei writer queue size");

namespace facebook {
namespace gorilla {

BeringeiClientStore::BeringeiClientStore() {
  // initialize clients
  std::unordered_map<int32_t, std::string> intervalConfigList = {
    {1, "/usr/local/beringei/build/beringei_1s.json"},
    {30, "/usr/local/beringei/build/beringei_30s.json"},
  };
  for (const auto& client : intervalConfigList) {
    // ensure we can read file
    if (FILE *file = fopen(client.second.c_str(), "r")) {
      fclose(file);
    } else {
      LOG(FATAL) << "Unable to read beringei configuration file: " << client.second;
    }
    auto configurationAdapter = std::make_shared<BeringeiConfigurationAdapter>(
      false, client.second);
    // insert read + write clients for the interval
    readClients_.insert({
      client.first,
      std::make_shared<BeringeiClient>(
        configurationAdapter, 1, BeringeiClient::kNoWriterThreads),
      });
    writeClients_.insert({
      client.first,
      std::make_shared<BeringeiClient>(
        configurationAdapter, FLAGS_writer_queue_size, 5),
      });
  }
}

static folly::Singleton<BeringeiClientStore> storeInstance_;

std::shared_ptr<BeringeiClientStore>
BeringeiClientStore::getInstance() {
  return storeInstance_.try_get();
}

std::shared_ptr<BeringeiClient>
BeringeiClientStore::getReadClient(int32_t intervalSec) {
  LOG(INFO) << "Request for read client " << intervalSec << " interval";
  auto clientIt = readClients_.find(intervalSec);
  if (clientIt != readClients_.end()) {
    return clientIt->second;
  }
  throw std::invalid_argument("No read client defined for " + std::to_string(intervalSec));
}

std::shared_ptr<BeringeiClient>
BeringeiClientStore::getWriteClient(int32_t intervalSec) {
  LOG(INFO) << "Request for write client " << intervalSec << " interval";
  auto clientIt = writeClients_.find(intervalSec);
  if (clientIt != writeClients_.end()) {
    return clientIt->second;
  }
  throw std::invalid_argument("No read client defined for " + std::to_string(intervalSec));
}

}
} // facebook::gorilla
