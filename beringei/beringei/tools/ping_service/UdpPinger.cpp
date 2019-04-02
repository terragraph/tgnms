/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "UdpPinger.h"

#include <linux/filter.h>
#include <pthread.h>
#include <sys/socket.h>
#include <unistd.h>

#include <chrono>
#include <cmath>
#include <future>
#include <thread>

#include <folly/Logging.h>
#include <folly/ThreadName.h>
#include <folly/gen/Base.h>
#include <folly/gen/Core.h>
#include <folly/stats/Histogram-defs.h>

using folly::to;
using folly::gen::as;
using folly::gen::from;
using folly::gen::mapped;
using std::chrono::duration_cast;
using std::chrono::system_clock;

DEFINE_int32(bucket_min, 1e3, "Minimum RTT in us");
DEFINE_int32(bucket_max, 3e5, "Maximum RTT in us");
DEFINE_int32(bucket_size, 5e3, "Bucket size for histograms");

namespace {

using facebook::gorilla::AsyncUdpSocket;

std::default_random_engine generator;
std::uniform_int_distribution<uint32_t> distribution(0, INT_MAX);

// Get a timestamp and store it in uint32_t object. Note that if the timestamp
// is larger than 32 bit, only the LSBs are recorded, since they are needed to
// calculate time differences.
template <class T>
inline uint32_t getTimestamp() {
  return duration_cast<T>(system_clock::now().time_since_epoch()).count();
}

void addToHistograms(
    const uint32_t rtt,
    const folly::IPAddress& address,
    std::shared_ptr<
        std::unordered_map<folly::IPAddress, facebook::gorilla::Histogram>>
        hostHistograms) {
  auto histogramsIt = hostHistograms->find(address);
  if (histogramsIt == hostHistograms->end()) {
    facebook::gorilla::Histogram histogram(
        FLAGS_bucket_size, FLAGS_bucket_min, FLAGS_bucket_max);
    auto result = hostHistograms->emplace(address, std::move(histogram));
    histogramsIt = result.first;
  }
  histogramsIt->second.addValue(rtt);
}

// The following two methods are used for checksum computations
inline uint32_t uint16_checksum(uint16_t* data, size_t size) {
  uint32_t sum = 0;

  while (size >= 2) {
    sum += (uint32_t)ntohs(*data);
    data++;
    size -= 2;
  }

  if (size == 1) {
    sum += (uint32_t)ntohs(*(uint8_t*)data);
  }

  return sum;
}

uint16_t ipv6UdpCheckSum(
    uint16_t* data,
    uint16_t size,
    struct in6_addr* src,
    struct in6_addr* dst,
    uint8_t proto) {
  uint32_t phdr[2];
  uint32_t sum = 0;
  uint16_t sum2;

  sum += uint16_checksum((uint16_t*)(void*)src, 16);
  sum += uint16_checksum((uint16_t*)(void*)dst, 16);

  phdr[0] = htonl(size);
  phdr[1] = htonl(proto);

  sum += uint16_checksum((uint16_t*)phdr, 8);
  sum += uint16_checksum(data, size);

  sum = (sum & 0xFFFF) + (sum >> 16);
  sum = (sum & 0xFFFF) + (sum >> 16);
  sum2 = htons((uint16_t)sum);
  sum2 = ~sum2;

  if (sum2 == 0) {
    return 0xFFFF;
  }

  return sum2;
}

// Creates a raw IPv6 UDP socket for sending
int createRawSocket(int qos, int bufferSize) {
  int sock_fd;

  sock_fd = ::socket(AF_INET6, SOCK_RAW, IPPROTO_UDP);
  if (sock_fd < 0) {
    LOG(ERROR) << "Error creating raw IPv6 socket '" << folly::errnoStr(errno)
               << "'";
    return -1;
  }

  struct sockaddr_in6 addr;
  addr.sin6_family = AF_INET6;
  addr.sin6_addr = IN6ADDR_ANY_INIT;
  addr.sin6_flowinfo = 0;
  addr.sin6_port = 0;

  if (::bind(sock_fd, reinterpret_cast<struct sockaddr*>(&addr), sizeof(addr)) <
      0) {
    LOG(ERROR) << "Error binding IPv6 socket '" << folly::errnoStr(errno)
               << "'";
    ::close(sock_fd);
    return -1;
  }

  if (::setsockopt(sock_fd, IPPROTO_IPV6, IPV6_TCLASS, &qos, sizeof(qos)) < 0) {
    LOG(WARNING) << "Error setsockopt IPV6_TCLASS failed '"
                 << folly::errnoStr(errno) << "'";
  }

  // This is 'ret 0' BPF instruction - discard all packets
  struct sock_filter code[] = {
      {0x06, 0, 0, 0x00000000},
  };

  struct sock_fprog bpf = {
      .len = sizeof(code) / sizeof(code[0]),
      .filter = code,
  };

  if (::setsockopt(sock_fd, SOL_SOCKET, SO_ATTACH_FILTER, &bpf, sizeof(bpf)) <
      0) {
    LOG(WARNING) << "Cannot assign BPF filter to send socket";
  }

  if (bufferSize) {
    LOG(INFO) << "Setting raw socket buffer to " << bufferSize;
    if (::setsockopt(
            sock_fd, SOL_SOCKET, SO_SNDBUF, &bufferSize, sizeof(bufferSize)) <
        0) {
      LOG(WARNING) << "Raw Socket: setsockopt SO_SNDBUF failed '"
                   << folly::errnoStr(errno) << "'";
    }

    int optval;
    socklen_t optlen;
    optlen = sizeof(optval);
    ::getsockopt(sock_fd, SOL_SOCKET, SO_SNDBUF, &optval, &optlen);

    LOG(INFO) << "Raw socket: getsockopt SO_SNDBUF returned '" << optval << "'";
  }

  return sock_fd;
}

// Creates and binds UDP sockets for receiving, reports the local ports that
// could not be bound
std::pair<
    std::vector<std::shared_ptr<AsyncUdpSocket>>,
    std::set<int> /* missing ports */>
createUdpSockets(
    folly::EventBase* evb,
    int basePort,
    int portCount,
    int bufferSize,
    AsyncUdpSocket::ReadCallback* cob) {
  CHECK(evb) << "Event base can't be null";

  std::vector<std::shared_ptr<AsyncUdpSocket>> sockets;
  std::set<int> missingPorts;

  // Create N sockets and try binding them to successive ports. If this fails,
  // use a random port
  for (int i = 0; i < portCount; ++i) {
    sockets.emplace_back(std::make_shared<AsyncUdpSocket>(evb));
    auto& socket = sockets.back();
    socket->setReusePort(true);

    try {
      socket->bind(folly::SocketAddress("::", basePort + i));
    } catch (const folly::AsyncSocketException& e) {
      missingPorts.emplace(basePort + i);
      continue;
    }

    // Enable timestamping for this socket
    int enabled = 1;
    if (::setsockopt(
            socket->getFD(),
            SOL_SOCKET,
            SO_TIMESTAMPNS,
            &enabled,
            sizeof(enabled)) < 0) {
      LOG(ERROR) << "UdpWorker: setsockopt SO_TIMESTAMPNS failed '"
                 << folly::errnoStr(errno) << "'";
      missingPorts.emplace(basePort + i);
      continue;
    }

    if (bufferSize) {
      if (::setsockopt(
              socket->getFD(),
              SOL_SOCKET,
              SO_RCVBUF,
              &bufferSize,
              sizeof(bufferSize)) == -1) {
        LOG(WARNING) << "UdpWorker: setsockopt SO_RCVBUF failed '"
                     << folly::errnoStr(errno) << "'";
      }

      int optval;
      socklen_t optlen;
      optlen = sizeof(optval);
      ::getsockopt(socket->getFD(), SOL_SOCKET, SO_RCVBUF, &optval, &optlen);

      if (2 * bufferSize != optval) {
        LOG(WARNING) << "Udp socket: getsockopt SO_RCVBUF returned '" << optval
                     << "'"
                     << " when requested " << bufferSize;
      }
    }

    if (cob) {
      socket->resumeRead(cob);
    }
  }

  return std::make_pair(sockets, missingPorts);
}

} // namespace

namespace facebook {
namespace gorilla {

UdpSender::UdpSender(
    const thrift::Config& config,
    int qos,
    int senderId,
    int numSenders,
    uint32_t signature,
    folly::IPAddress srcIp,
    const std::set<int>& missingPorts,
    std::shared_ptr<folly::NotificationQueue<UdpTestPlan>> inputQueue)
    : config_(config),
      qos_(qos),
      senderId_(senderId),
      numSenders_(numSenders),
      signature_(signature),
      srcIp_(srcIp),
      missingPorts_(missingPorts),
      inputQueue_(std::move(inputQueue)) {}

void UdpSender::run() {
  socket_ = createRawSocket(qos_, config_.socket_buffer_size);
  if (socket_ == -1) {
    return;
  }

  // Drain the input queue
  prepareConsumer();
  CHECK(sendingConsumer_);
  sendingConsumer_->startConsuming(&evb_, inputQueue_.get());

  // Run the pinging loop
  evb_.loopForever();
  ::close(socket_);

  LOG(INFO) << "UdpSender " << senderId_ << " finished the run loop";
}

void UdpSender::buildAddressMap() {
  for (auto& testPlan : testPlans_) {
    // Target address to send to
    struct sockaddr_in6 addr;
    addr.sin6_family = AF_INET6;
    addr.sin6_port = 0;

    if (::inet_pton(
            AF_INET6, testPlan.target.ip.c_str(), &addr.sin6_addr.s6_addr) <
        0) {
      LOG(ERROR) << "Malformed IPv6 address " << testPlan.target.ip;
      return;
    }

    auto& mappedAddr = addressMap_[testPlan.target.ip];
    ::memcpy(&mappedAddr, &addr, sizeof(addr));
  }
}

void UdpSender::prepareConsumer() {
  sendingConsumer_ =
      folly::NotificationQueue<UdpTestPlan>::Consumer::make([this](
          UdpTestPlan && testPlan) noexcept {
        // Enqueue test plans until we receive the signal to start probing
        if (testPlan.numPackets != 0) {
          testPlans_.push_back(std::move(testPlan));
          return;
        }

        sendingConsumer_->stopConsuming();
        buildAddressMap();
        pingAllTargets();

        evb_.runAfterDelay(
            [this]() noexcept { evb_.terminateLoopSoon(); },
            config_.pinger_cooldown_time * 1000 /* in ms */
        );
      });
}

void UdpSender::pingAllTargets() {
  LOG(INFO) << "Worker " << senderId_ << " preparing to ping "
            << testPlans_.size() << " targets";

  // We add the full allowed range of source ports except for the ports that
  // receivers could not bind to
  std::vector<int> srcPorts;

  for (int port = config_.base_src_port;
       port < config_.base_src_port + config_.src_port_count;
       port++) {
    if (missingPorts_.find(port) != missingPorts_.end()) {
      continue;
    }
    srcPorts.push_back(port);
  }

  while (true) {
    bool done = true;
    auto start = std::chrono::high_resolution_clock::now();
    int packetsSent = 0;
    int sendFailed = 0;

    ProbeBody* probeBody;
    UdpHeader* udpHeader;

    // Update the counters inside each testPlan struct
    for (auto& testPlan : testPlans_) {
      if (!srcIp_.isLoopback() && srcPorts.size() &&
          (testPlan.packetsSent < testPlan.numPackets)) {
        done = false;

        // Target address to send to
        auto& addr = addressMap_[testPlan.target.ip];

        ::memset(&buf_[0], 0, sizeof(buf_));
        udpHeader = reinterpret_cast<UdpHeader*>(&buf_[0]);
        probeBody = reinterpret_cast<ProbeBody*>(&buf_[sizeof(UdpHeader)]);

        udpHeader->srcPort =
            htons(srcPorts[testPlan.packetsSent++ % srcPorts.size()]);
        udpHeader->dstPort = htons(config_.target_port);
        udpHeader->length = htons(sizeof(UdpHeader) + sizeof(ProbeBody));

        probeBody->signature = htonl(signature_);
        probeBody->pingerSentTime =
            htonl(getTimestamp<std::chrono::microseconds>());
        probeBody->tclass = qos_;

        struct in6_addr srcAddr =
            *reinterpret_cast<const struct in6_addr*>(srcIp_.bytes());

        udpHeader->checkSum = ipv6UdpCheckSum(
            reinterpret_cast<uint16_t*>(&buf_[0]),
            sizeof(buf_),
            &srcAddr,
            &((reinterpret_cast<struct sockaddr_in6*>(&addr))->sin6_addr),
            IPPROTO_UDP);

        if (::sendto(
                socket_,
                &buf_[0],
                sizeof(buf_),
                MSG_DONTWAIT,
                reinterpret_cast<struct sockaddr*>(&addr),
                sizeof(struct sockaddr_in6)) == -1) {
          // If we can try again, decrement the packet count so we can try
          // resending later
          if (errno == EAGAIN) {
            FB_LOG_EVERY_MS(INFO, 1000) << "EAGAIN in v6 sendto";
            --testPlan.packetsSent;
          } else {
            sendFailed++;
            FB_LOG_EVERY_MS(ERROR, 1000) << "UdpSender: v6 write error '"
                                         << folly::errnoStr(errno) << "'";
          }
        } else {
          packetsSent++;
        }
      }
    }

    auto finish = std::chrono::high_resolution_clock::now();

    if (sendFailed) {
      LOG(ERROR) << "Failed sending " << sendFailed << " out of "
                 << packetsSent + sendFailed << " packets";
    }

    if (done) {
      break;
    }

    auto elapsed = duration_cast<std::chrono::microseconds>(finish - start);

    // Calculate the pps we achieved in this sweep
    double pps = std::ceil((1000000.0 / elapsed.count()) * packetsSent);

    FB_LOG_EVERY_MS(INFO, 1000)
        << "Ping sweep took: " << elapsed.count() << " usec, sent "
        << packetsSent << " packets, pps was " << pps << " target pps is "
        << config_.pinger_rate / numSenders_;

    // Wait to hit the desired pps goal
    if (pps > config_.pinger_rate / numSenders_) {
      double delay = std::ceil(
          numSenders_ * packetsSent * 1000000.0 / config_.pinger_rate);
      auto delayUsec = std::chrono::microseconds(to<int64_t>(delay)) - elapsed;
      FB_LOG_EVERY_MS(INFO, 1000)
          << "Sleeping for " << delayUsec.count() << " usecs";
      /* sleep override */
      std::this_thread::sleep_for(delayUsec);
    }

  } // while

  LOG(INFO) << "Sender " << senderId_
            << " sent all probes, waiting for responses for "
            << config_.pinger_cooldown_time << " seconds";
}

void UdpReceiver::waitForSocketsToBind() {
  // Busy wait for variable to be set
  while (!socketsAreBound_) {
    std::this_thread::yield();
  }
}

UdpReceiver::UdpReceiver(
    const thrift::Config& config,
    uint32_t signature,
    int receiverId,
    std::vector<std::shared_ptr<folly::NotificationQueue<ReceiveProbe>>>
        recvQueues,
    const std::unordered_map<folly::IPAddress, thrift::Target>& ipToTargetMap)
    : config_(config),
      signature_(signature),
      receiverId_(receiverId),
      recvQueues_(recvQueues),
      ipToTargetMap_(ipToTargetMap),
      hostHistograms_(
          std::make_shared<std::unordered_map<folly::IPAddress, Histogram>>()) {
  // Wipe out the message header first
  memset(&msg_, 0, sizeof(msg_));

  // We only expect to receive one block of data, single entry in the vector
  msg_.msg_iov = &entry_;
  msg_.msg_iovlen = 1;

  entry_.iov_base = readBuf_;
  entry_.iov_len = sizeof(readBuf_);

  // Control message buffer used to receive time-stamps from the kernel
  msg_.msg_control = ctrlBuf_;
  msg_.msg_controllen = sizeof(ctrlBuf_);

  // Prepare to receive IPv6 addresses
  ::memset(&addrStorage_, 0, sizeof(addrStorage_));
  msg_.msg_name = &addrStorage_;
  msg_.msg_namelen = sizeof(sockaddr_storage);
}

void UdpReceiver::run(int qos) {
  // These missing ports are not used in receiving thread. They are a byproduct
  // of the createUdpSockets function
  std::set<int> _missingPorts;

  // Create the sockets to be listening on
  tie(sockets_, _missingPorts) = createUdpSockets(
      &evb_,
      config_.base_src_port,
      config_.src_port_count,
      config_.socket_buffer_size,
      this /* cob */);

  socketsAreBound_ = true;

  receivingConsumer_ =
      folly::NotificationQueue<ReceiveProbe>::Consumer::make([this](
          ReceiveProbe && msg) noexcept {
        consumeMessage(std::forward<ReceiveProbe>(msg));
      });
  receivingConsumer_->startConsuming(&evb_, recvQueues_[receiverId_].get());

  // This will loop until stopped explicitly by an external caller
  evb_.loopForever();

  // Aggregate the stats that we have accumulated
  summarizeResults(qos);
}

void UdpReceiver::stop() {
  evb_.runInEventBaseThread([&] {
    closeSockets();
    receivingConsumer_->stopConsuming();
    evb_.terminateLoopSoon();
  });
}

const UdpTestResults& UdpReceiver::getResults() {
  return results_;
}

void UdpReceiver::summarizeResults(int qos) {
  LOG(INFO) << "UDP receiver starting result summarization";

  CHECK(!evb_.isRunning());

  uint32_t now = system_clock::to_time_t(system_clock::now());
  for (const auto& histogramIt : *hostHistograms_) {
    auto result = std::make_shared<thrift::TestResult>();
    result->timestamp = now;
    result->metadata.tos = qos;

    try {
      const auto& target = ipToTargetMap_.at(histogramIt.first);
      result->metadata.dst = target;
    } catch (const std::out_of_range& e) {
      // We receive some packets that were not in our test plan
      VLOG(1) << "Received unexpected packet from " << histogramIt.first;
      continue;
    }

    const auto& histogram = histogramIt.second;
    result->metrics.numRecv = histogram.getTotalCount();

    // The result metrics are in ms
    result->metrics.rttP75 =
        (double)histogram.getPercentileEstimate(0.75) / 1000;
    result->metrics.rttP90 =
        (double)histogram.getPercentileEstimate(0.9) / 1000;
    result->metrics.avg = histogram.getAverage() / 1000;
    result->metrics.pctBelowMaxRtt = histogram.computePctBelowMax();
    results_.push_back(std::move(result));
  }
  hostHistograms_->clear();

  LOG(INFO) << "Receiver done summarizing results";
  LOG(INFO) << "Built partial results host size " << results_.size();
}

void UdpReceiver::consumeMessage(ReceiveProbe&& message) noexcept {
  const auto rtt = message.rtt;
  auto address = message.remoteAddress.getIPAddress();
  auto targetIt = ipToTargetMap_.find(address);

  if (targetIt != ipToTargetMap_.end()) {
    addToHistograms(rtt, address, hostHistograms_);
  } else {
    FB_LOG_EVERY_MS(ERROR, 100)
        << "Received unexpected packet from " << address;
  }
}

void UdpReceiver::closeSockets() {
  for (auto& socket : sockets_) {
    socket->pauseRead();
    socket->close();
  }
  sockets_.clear();
}

void UdpReceiver::getMessageHeader(struct msghdr** msg) noexcept {
  ::memset(&addrStorage_, 0, sizeof(addrStorage_));
  msg_.msg_namelen = sizeof(sockaddr_storage);
  *msg = &msg_;
}

void UdpReceiver::onMessageAvailable(size_t len) noexcept {
  uint32_t now = getTimestamp<std::chrono::microseconds>();

  folly::SocketAddress addr;
  addr.setFromSockaddr(
      reinterpret_cast<sockaddr*>(&addrStorage_), sizeof(addrStorage_));

  if (msg_.msg_flags & MSG_TRUNC) {
    LOG(ERROR) << "UdpReadCallback: Dropping truncated data packet from "
               << addr;
    return;
  }

  if (len < kProbeDataLen) {
    LOG(ERROR) << "UdpReadCallback: Received malformed packet";
    return;
  }

  // Get the kernel timestamp
  struct cmsghdr* cmsg;
  struct timespec* stamp{nullptr};

  for (cmsg = CMSG_FIRSTHDR(&msg_); cmsg; cmsg = CMSG_NXTHDR(&msg_, cmsg)) {
    switch (cmsg->cmsg_level) {
      case SOL_SOCKET:
        switch (cmsg->cmsg_type) {
          case SO_TIMESTAMPNS: {
            stamp = (struct timespec*)CMSG_DATA(cmsg);
            break;
          }
        }
    }
  }

  // Set recvTs to "now" if kernel timestamp is not supported
  uint32_t recvTs = now;
  if (stamp) {
    // The kernel receive timestamp
    recvTs = stamp->tv_nsec / 1000 + stamp->tv_sec * 1000000;
  }

  ReceiveProbe probe;
  probe.remoteAddress = addr;
  ProbeBody probeBody;
  ::memcpy(&probeBody, readBuf_, sizeof(probeBody));

  auto signature = ntohl(probeBody.signature);
  if (signature != signature_) {
    // Received a bogus packet
    LOG(ERROR) << "Signature mismatched in packet from " << addr;
    return;
  }

  // Calculate the adjustment on receive side (Only used for logging)
  uint32_t adjPinger = now - recvTs;

  // How much to adjust RTT based on target-collected timestamps. We use this
  // data to compensate for wait time in the target process
  uint32_t adjTarget =
      (ntohl(probeBody.targetRespTime) - ntohl(probeBody.targetRcvdTime));

  probe.rtt = recvTs - ntohl(probeBody.pingerSentTime) - adjTarget;

  // Log the RTT adjustments
  FB_LOG_EVERY_MS(INFO, 1000) << folly::sformat(
      "Measured RTT {} usec for addr {}, adjustement by pinger {}, adjustment "
      "by target {}",
      probe.rtt,
      addr.describe(),
      adjPinger,
      adjTarget);

  std::string siteName;
  try {
    siteName = ipToTargetMap_.at(addr.getIPAddress()).site;
  } catch (const std::out_of_range& e) {
    FB_LOG_EVERY_MS(ERROR, 500)
        << "Response from unknown IP address " << addr.getIPAddress();
    return;
  }

  auto it = siteNameToQueueId_.find(siteName);
  int queueId;
  if (it == siteNameToQueueId_.end()) {
    queueId = hasher_(siteName) % recvQueues_.size();
    siteNameToQueueId_.emplace(std::move(siteName), queueId);
  } else {
    queueId = it->second;
  }

  // Bypass NotificationQueue, since this is for ourselves
  if (queueId == receiverId_) {
    consumeMessage(std::move(probe));
  } else {
    auto result = recvQueues_[queueId]->tryPutMessageNoThrow(std::move(probe));
    if (!result) {
      LOG(ERROR) << "Failed to enqueue packet from " << addr;
    }
  }
}

UdpPinger::UdpPinger(const thrift::Config& config, folly::IPAddress srcIp)
    : config_(config), srcIp_(srcIp) {}

UdpTestResults UdpPinger::run(
    const std::vector<UdpTestPlan>& testPlans,
    int qos) {
  auto numSenders = (int)config_.num_sender_threads;
  auto numReceivers = (int)config_.num_receiver_threads;

  LOG(INFO) << "UdpPinger for QoS " << qos << " and pps " << config_.pinger_rate
            << " starting with " << numSenders << " senders and "
            << numReceivers << " receivers";

  // Signature value to use for this pinger run
  uint32_t signature = distribution(generator);

  // Pre-bind the UDP sockets to find any "blocked" source ports. EventBase only
  // needed to create the sockets
  folly::EventBase _evb;
  std::vector<std::shared_ptr<AsyncUdpSocket>> _sockets;
  std::set<int> missingPorts;

  tie(_sockets, missingPorts) = createUdpSockets(
      &_evb,
      config_.base_src_port,
      config_.src_port_count,
      config_.socket_buffer_size,
      nullptr /* cob */);

  if (missingPorts.size()) {
    LOG(WARNING) << "Could not bind UDP ports "
                 << folly::sformat(folly::join(
                        ", ",
                        from(missingPorts) | mapped([](int port) {
                          return to<std::string>(port);
                        }) | as<std::vector>()));
  }

  // Create the sender queues
  std::vector<std::future<void>> sendFutures;
  std::vector<std::shared_ptr<folly::NotificationQueue<UdpTestPlan>>>
      sendingQueues;
  std::vector<std::thread> senderThreads;

  for (int i = 0; i < numSenders; ++i) {
    sendingQueues.emplace_back(
        std::make_shared<folly::NotificationQueue<UdpTestPlan>>());
    auto sender = std::make_shared<UdpSender>(
        config_,
        qos,
        i /* senderId */,
        numSenders,
        signature,
        srcIp_,
        missingPorts,
        sendingQueues[i]);
    senderThreads.emplace_back(std::thread([sender, i] {
      folly::setThreadName(folly::sformat("UdpPinger-Sender-{}", i));
      sender->run();
    }));
  }

  // Create mapping tables used by the receivers
  std::unordered_map<folly::IPAddress, thrift::Target> ipToTargetMap;

  for (const auto& testPlan : testPlans) {
    try {
      folly::IPAddress ip(testPlan.target.ip);
      ipToTargetMap.emplace(std::move(ip), testPlan.target);
    } catch (const folly::IPAddressFormatException& e) {
      LOG(ERROR) << testPlan.target.ip << ":" << folly::exceptionStr(e);
    }
  }

  // Create the receiver queues. This is where UdpReceivers will dump their
  // results
  std::vector<std::shared_ptr<folly::NotificationQueue<ReceiveProbe>>>
      recvQueues;

  // We create all queues together since every receiver needs to know them all
  for (int i = 0; i < numReceivers; ++i) {
    recvQueues.emplace_back(
        std::make_shared<folly::NotificationQueue<ReceiveProbe>>());
  }

  // Start the receivers
  std::vector<std::thread> recvThreads;
  std::vector<std::shared_ptr<UdpReceiver>> receivers;
  for (int i = 0; i < numReceivers; ++i) {
    receivers.emplace_back(std::make_shared<UdpReceiver>(
        config_, signature, i /* receiverId */, recvQueues, ipToTargetMap));
    recvThreads.emplace_back(std::thread([i, receivers, qos] {
      folly::setThreadName(folly::sformat("UdpPinger-Receiver-{}", i));
      receivers[i]->run(qos);
    }));

    receivers[i]->waitForSocketsToBind();
  }

  // Now we can close the sockets since all receivers have been created, and
  // all sockets have been bound
  for (auto& socket : _sockets) {
    socket->close();
  }

  // Probes we send (and expect to receive) per host
  std::unordered_map<std::string, int> hostProbeCount;
  std::unordered_map<std::string, thrift::Target> hostToTargetMap;
  for (const auto& testPlan : testPlans) {
    hostProbeCount.emplace(testPlan.target.name, testPlan.numPackets);
    hostToTargetMap.emplace(testPlan.target.name, testPlan.target);
  }

  // Submit test plans to senders
  std::hash<std::string> hasher;
  for (const auto& testPlan : testPlans) {
    auto queueNum = hasher(testPlan.target.ip) % numSenders;
    auto result =
        sendingQueues[queueNum]->tryPutMessageNoThrow(std::move(testPlan));
    if (!result) {
      LOG(ERROR) << "Cannot enqueue test plan";
    }
  }

  for (auto& queue : sendingQueues) {
    // In-band stop signal
    UdpTestPlan dummyPlan;
    dummyPlan.numPackets = 0;
    queue->tryPutMessageNoThrow(dummyPlan);
  }

  LOG(INFO) << "Finished dispatching all plans";

  // Wait for the sender threads to finish
  for (auto& thread : senderThreads) {
    thread.join();
  }

  // Tell the receiver threads to stop
  LOG(INFO) << "Telling all receivers to stop...";
  for (int i = 0; i < numReceivers; ++i) {
    receivers[i]->stop();
    recvThreads[i].join();
  }

  // Combine results from all receivers
  LOG(INFO) << "All receivers have stopped...";
  UdpTestResults results;

  for (auto& receiver : receivers) {
    auto& partialResults = receiver->getResults();
    LOG(INFO) << "Got partial results host size " << partialResults.size();
    results.insert(results.end(), partialResults.begin(), partialResults.end());
  }

  for (auto& result : results) {
    result->metrics.numXmit = hostProbeCount.at(result->metadata.dst.name);
    hostProbeCount.erase(result->metadata.dst.name);

    result->metrics.lossRatio =
        1 - (float)result->metrics.numRecv / result->metrics.numXmit;
  }

  // Output empty results
  uint32_t now = system_clock::to_time_t(system_clock::now());

  // hostProbeCount now only contains the records for the hosts that never
  // responded at all
  for (const auto& hostProbeIt : hostProbeCount) {
    auto result = std::make_shared<thrift::TestResult>();
    result->timestamp = now;
    result->metrics.numXmit = hostProbeIt.second;
    result->metrics.lossRatio = 1;
    const auto& target = hostToTargetMap[hostProbeIt.first];
    result->metadata.dst = target;
    result->metadata.tos = qos;
    result->metadata.dead = true;

    VLOG(1) << "Tagged host '" << result->metadata.dst.name << "' as dead";
    results.push_back(std::move(result));
  }

  return results;
}

} // namespace gorilla
} // namespace facebook
