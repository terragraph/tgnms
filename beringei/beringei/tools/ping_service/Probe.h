/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#pragma once

namespace facebook {
namespace gorilla {

// The size of the probe body, to embed the id (signature) and timestamps
const int kProbeDataLen = 32;

// Defines the structure of the probe body. The below timestamps are all in
// usecs, and defined with 32-bit resolution.
struct ProbeBody {
  // The signature that the sender puts in. Used to identify a valid probe
  uint32_t signature;

  // Timestamp when the probe was sent (usec)
  uint32_t pingerSentTime;

  // Timestamp when probe was received by target
  uint32_t targetRcvdTime;

  // Timestamp when target replied with this probe
  uint32_t targetRespTime;

  // Traffic class used by this probe
  uint8_t tclass;

  char padding[kProbeDataLen - 4 * sizeof(uint32_t) - sizeof(uint8_t)];
};

} // namespace gorilla
} // namespace facebook
