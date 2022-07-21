/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

namespace facebook {
namespace terragraph {
namespace stats {

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

} // namespace stats
} // namespace terragraph
} // namespace facebook
