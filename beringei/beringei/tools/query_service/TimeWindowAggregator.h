/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

#include <folly/io/async/EventBaseManager.h>

namespace facebook {
namespace gorilla {

class TimeWindowAggregator {
 public:
  explicit TimeWindowAggregator();

  // run eventbase
  void start();
  void timerCb();
  // return the delay (in seconds) to run the next aligned interval
  // ex: if running at a 1-minute interval and current time is 09:00:35 then
  // delay for 25 seconds to run at 09:01:00
  time_t getNextIntervalDelay();

 private:
  folly::EventBase eb_;
  std::unique_ptr<folly::AsyncTimeout> timer_{nullptr};
};
} // namespace gorilla
} // namespace facebook
