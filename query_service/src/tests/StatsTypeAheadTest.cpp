/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <gtest/gtest.h>

// allows gtests to modify private data so that tests can
// mock data about the class to test
#define private public

#include "../StatsTypeAheadCache.h"

#include "if/gen-cpp2/Stats_types_custom_protocol.h"
#include "if/gen-cpp2/beringei_query_types_custom_protocol.h"

using namespace facebook::stats;
using namespace ::testing;
using namespace facebook;
using namespace gorilla;
using facebook::gorilla::StatsTypeAheadCache;

class StatsTypeAheadTest : public testing::Test {
 protected:
  void SetUp() override {
    nodeA_.name = "nodeA";
    nodeA_.mac_addr = "00:11:22:33:44:aa";

    nodeB_.name = "nodeB";
    nodeB_.mac_addr = "00:11:22:33:44:BB";

    nodeD_.name = "nodeD";
    nodeD_.mac_addr = "00:11:22:33:44:Dd";
  }

  void process(StatsTypeAheadCache& statsTypeAhead) {
    statsTypeAhead.nodesByName_.emplace("nodeA", nodeA_);
    statsTypeAhead.nodesByName_.emplace("nodeB", nodeB_);
    statsTypeAhead.nodesByName_.emplace("nodeD", nodeD_);

    stats::KeyMetaData kmd;
    kmd.srcNodeName = "nodeA";
    std::unordered_map<
        std::string /* key name */,
        std::shared_ptr<stats::KeyMetaData>>
        keyList;
    statsTypeAhead.nodeMacToKeyList_.emplace("00:11:22:33:44:bb", keyList);
    keyList["blah"] = std::make_shared<stats::KeyMetaData>(kmd);
    statsTypeAhead.nodeMacToKeyList_.emplace("00:11:22:33:44:aa", keyList);

    kmd.srcNodeName = "nodeD";
    keyList["blah"] = std::make_shared<stats::KeyMetaData>(kmd);
    statsTypeAhead.nodeMacToKeyList_.emplace("00:11:22:33:44:dd", keyList);
  }

  stats::QueryRequest queryRequest_;
  TACacheMap typeaheadCache_;
  query::Node nodeA_;
  query::Node nodeB_;
  query::Node nodeD_;
};

TEST_F(StatsTypeAheadTest, NodeMacTest) {
  StatsTypeAheadCache statsTypeAhead;

  // process query
  process(statsTypeAhead);

  auto nodeMac = statsTypeAhead.nodeNameToMac("nodeA");
  ASSERT_EQ(nodeMac, "00:11:22:33:44:aa");

  nodeMac = statsTypeAhead.nodeNameToMac("nodeB");
  ASSERT_EQ(nodeMac, "00:11:22:33:44:bb");

  nodeMac = statsTypeAhead.nodeNameToMac("nodeC");
  ASSERT_TRUE(!nodeMac);

  nodeMac = statsTypeAhead.nodeNameToMac("FA:CE:B0:0C:00:11");
  ASSERT_EQ(nodeMac, "fa:ce:b0:0c:00:11");

  auto nodeName = statsTypeAhead.macToNodeName("00:11:22:33:44:aa");
  ASSERT_EQ(nodeName, "nodeA");

  nodeName = statsTypeAhead.macToNodeName("00:11:22:33:44:AA");
  ASSERT_EQ(nodeName, "nodeA");

  nodeName = statsTypeAhead.macToNodeName("00:11:22:33:44:bb");
  ASSERT_TRUE(!nodeName);

  nodeName = statsTypeAhead.macToNodeName("00:11:22:33:44:Dd");
  ASSERT_EQ(nodeName, "nodeD");

  nodeName = statsTypeAhead.macToNodeName("00:11:22:33:44:CC");
  ASSERT_TRUE(!nodeName);

  nodeName = statsTypeAhead.macToNodeName("nodeC");
  ASSERT_EQ(nodeName, "nodeC");
}
