/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include <atomic>
#include <functional>
#include <memory>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>

#include <folly/ExceptionString.h>
#include <folly/io/async/EventBaseManager.h>
#include <folly/io/async/NotificationQueue.h>
#include <folly/stats/Histogram.h>
#include <folly/String.h>

#include "AsyncUdpSocket.h"
#include "Probe.h"
#include "if/gen-cpp2/Pinger_types.h"

namespace facebook {
namespace terragraph {
namespace stats {

struct UdpHeader {
  uint16_t srcPort{0};
  uint16_t dstPort{0};
  uint16_t length{0};
  uint16_t checkSum{0};
};

struct UdpTestPlan {
  // IP address of the destination machine
  thrift::Target target;

  // Number of packets to send
  int numPackets{0};

  // Number of packets that have been sent
  int packetsSent{0};
};

struct UdpTestResults {
  std::vector<std::shared_ptr<thrift::TestResult>> hostResults;
  std::vector<std::shared_ptr<thrift::TestResult>> networkResults;
};

struct ReceiveProbe {
  uint32_t rtt; // in microseconds
  folly::SocketAddress remoteAddress;
};

class Histogram : public folly::Histogram<uint32_t> {
 public:
  Histogram(uint32_t bucketSize, uint32_t min, uint32_t max)
      : folly::Histogram<uint32_t>(bucketSize, min, max) {}

  void addValue(uint32_t value) {
    folly::Histogram<uint32_t>::addValue(value);
    average_ =
        average_ * ((float)count_ / (count_ + 1)) + (float)value / (count_ + 1);
    ++count_;
    if (value > maxSample_) {
      maxSample_ = value;
    }
  }

  double getAverage() const {
    return average_;
  }

  uint64_t getTotalCount() const {
    return count_;
  }

  uint32_t getMaxSample() const {
    return maxSample_;
  }

 private:
  double average_{0};
  uint64_t count_{0};
  uint32_t maxSample_{0};
};

class UdpSender {
 public:
  UdpSender(
      const thrift::PingerConfig& config,
      int qos,
      int senderId,
      int numSenders,
      uint32_t signature,
      folly::IPAddress srcIp,
      const std::set<int>& missingPorts,
      std::shared_ptr<folly::NotificationQueue<UdpTestPlan>> inputQueue);

  void run();

 private:
  UdpSender(const UdpSender&) = delete;
  UdpSender& operator=(const UdpSender&) = delete;

  // Global UDP pinger config object
  const thrift::PingerConfig config_;

  // The QoS value to use in probes
  const int qos_;

  // Unique identifier of this sender
  const int senderId_;

  // Total number of senders
  const int numSenders_;

  // Signature to embed in our probes
  const uint32_t signature_;

  // Source IP address for pinging
  const folly::IPAddress srcIp_;

  // Set of source ports we can't use
  const std::set<int> missingPorts_;

  // Queue to read test plans from
  std::shared_ptr<folly::NotificationQueue<UdpTestPlan>> inputQueue_;

  // Raw socket
  int socket_{-1};

  // The callback used to accumulate input data and send pings
  std::unique_ptr<
      folly::NotificationQueue<UdpTestPlan>::Consumer,
      folly::DelayedDestruction::Destructor>
      sendingConsumer_;

  // The test plan accumulated from input queue
  std::vector<UdpTestPlan> testPlans_;

  // Mapping of the string address to its parsed binary representation
  std::unordered_map<std::string, struct sockaddr_storage> addressMap_;

  folly::EventBase evb_;

  // The buffer used to send probes
  uint8_t buf_[kProbeDataLen + sizeof(UdpHeader)];

  // Det the callback that accumulates incoming targets
  void prepareConsumer();

  // Iterates over the test plans and pre-builds addresses
  void buildAddressMap();

  // Ping all accumulated targets
  void pingAllTargets();
};

// UdpReceiver runs an event loop that dispatches two type of
//
// callbacks:
// (1) coming from UDP socket read events. Those are processes
//     and passed other to a receive queue that must handle them
// (2) notification queue that receives samples from all other
//     read callbacks (running in all receive threads) and
//     accumulates them in internal storage
//
// Receiver accumulates samples for N clusters allocated to it
// This means that other threads the receive samples for the
// clusters belonging to this receiver are responsible for
// redirecting it here

class UdpReceiver final : public AsyncUdpSocket::ReadCallback {
 public:
  UdpReceiver(
      const thrift::PingerConfig& config,
      uint32_t signature,
      int receiverId,
      std::vector<std::shared_ptr<folly::NotificationQueue<ReceiveProbe>>>
          recvQueues,
      const std::unordered_map<folly::IPAddress, thrift::Target>&
          ipToTargetMap);
  virtual ~UdpReceiver() {}

  // AsyncUdpSocket::ReadCallback methods
  void onMessageAvailable(size_t len) noexcept override;
  void getMessageHeader(struct msghdr** msg) noexcept override;
  void onReadClosed() noexcept override {}
  void onReadError(const folly::AsyncSocketException& ex) noexcept override {
    LOG(ERROR) << "UdpReadCallback error: " << folly::exceptionStr(ex);
  }

  void waitForSocketsToBind();

  // Invokes the main receiver loop
  void run(int qos);

  // Stops the event loop
  void stop();

  // Called on stopped receiver retrieve results
  const UdpTestResults& getResults();

 private:
  UdpReceiver(const UdpReceiver&) = delete;
  UdpReceiver& operator=(const UdpReceiver&) = delete;

  // The global pinger config
  const thrift::PingerConfig& config_;

  // The expected signature in the received probes
  const uint32_t signature_;

  // Unique identifier in receiver set
  const int receiverId_;

  const std::vector<std::shared_ptr<folly::NotificationQueue<ReceiveProbe>>>
      recvQueues_;

  // Read-only lookup tables to pull various meta-data
  const std::unordered_map<folly::IPAddress, thrift::Target>& ipToTargetMap_;

  // Hash function that used to load-balance among queues
  std::hash<std::string> hasher_;

  // Set to true once the receiver is done binding the sockets. Used to
  // synchronize with the main thread
  std::atomic<bool> socketsAreBound_{false};

  // The consumer that will be processing samples read from UDP sockets
  std::unique_ptr<
      folly::NotificationQueue<ReceiveProbe>::Consumer,
      folly::DelayedDestruction::Destructor>
      receivingConsumer_;

  // Caches the network name to queue id
  std::unordered_map<std::string, int> networkNameToQueueId_;

  // Histogram for storing per-host statistics
  std::shared_ptr<std::unordered_map<folly::IPAddress, Histogram>>
      hostHistograms_;

  // Histogram for storing per-network statistics
  std::shared_ptr<std::unordered_map<std::string, Histogram>>
      networkHistograms_;

  // The results of the tests for this receiver
  UdpTestResults results_;

  // The event loop running in the thread
  folly::EventBase evb_;

  // Sockets to receive data on
  std::vector<std::shared_ptr<AsyncUdpSocket>> sockets_;

  // The data buffer
  char readBuf_[kProbeDataLen];

  // The control message buffer
  char ctrlBuf_[kProbeDataLen];

  // The message header to receive into
  struct msghdr msg_;

  // The IO vector for data to be received with recvmsg
  struct iovec entry_;

  // The address of the peer who sent us the message
  sockaddr_storage addrStorage_;

  // Consume one probe
  void consumeMessage(ReceiveProbe&& message) noexcept;

  void closeSockets();

  void summarizeResults(int qos);
};

class UdpPinger {
 public:
  UdpPinger(const thrift::PingerConfig& config, folly::IPAddress srcIp);
  UdpTestResults run(const std::vector<UdpTestPlan>& testPlans, int qos) const;

 private:
  // The global configuration object
  thrift::PingerConfig config_;

  // Source IP address used for pinging
  folly::IPAddress srcIp_;
};

} // namespace stats
} // namespace terragraph
} // namespace facebook
