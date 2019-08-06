
/**
 * Copyright (c) 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#include "AsyncUdpSocket.h"

#include <errno.h>
#include <fcntl.h>
#include <sys/socket.h>
#include <unistd.h>

#include <folly/Likely.h>
#include <folly/io/async/EventBase.h>

using namespace folly;

namespace facebook {
namespace gorilla {

AsyncUdpSocket::AsyncUdpSocket(EventBase* evb)
    : EventHandler(CHECK_NOTNULL(evb)),
      eventBase_(evb),
      fd_(-1),
      readCallback_(nullptr) {
  DCHECK(evb->isInEventBaseThread());
}

AsyncUdpSocket::~AsyncUdpSocket() {
  if (fd_ != -1) {
    close();
  }
}

void AsyncUdpSocket::bind(const folly::SocketAddress& address) {
  int socket = ::socket(address.getFamily(), SOCK_DGRAM, IPPROTO_UDP);
  if (socket == -1) {
    throw AsyncSocketException(
        AsyncSocketException::NOT_OPEN,
        "error creating async udp socket",
        errno);
  }

  auto g = folly::makeGuard([&] { ::close(socket); });

  // Put the socket in non-blocking mode
  int ret = fcntl(socket, F_SETFL, O_NONBLOCK);
  if (ret != 0) {
    throw AsyncSocketException(
        AsyncSocketException::NOT_OPEN,
        "failed to put socket in non-blocking mode",
        errno);
  }

  if (reuseAddr_) {
    // Put the socket in reuse mode
    int value = 1;
    if (setsockopt(socket, SOL_SOCKET, SO_REUSEADDR, &value, sizeof(value)) !=
        0) {
      throw AsyncSocketException(
          AsyncSocketException::NOT_OPEN,
          "failed to put socket in reuse mode",
          errno);
    }
  }

  if (reusePort_) {
    // Put the socket in port reuse mode
    int value = 1;
    if (setsockopt(socket, SOL_SOCKET, SO_REUSEPORT, &value, sizeof(value)) !=
        0) {
      ::close(socket);
      throw AsyncSocketException(
          AsyncSocketException::NOT_OPEN,
          "failed to put socket in reuse_port mode",
          errno);
    }
  }

  // If we're using IPv6, make sure we don't accept v4-mapped connections
  if (address.getFamily() == AF_INET6) {
    int flag = 1;
    if (::setsockopt(socket, IPPROTO_IPV6, IPV6_V6ONLY, &flag, sizeof(flag))) {
      throw AsyncSocketException(
          AsyncSocketException::NOT_OPEN, "Failed to set IPV6_V6ONLY", errno);
    }
  }

  // Bind to the address
  sockaddr_storage addrStorage;
  address.getAddress(&addrStorage);
  sockaddr* saddr = reinterpret_cast<sockaddr*>(&addrStorage);
  if (::bind(socket, saddr, address.getActualSize()) != 0) {
    throw AsyncSocketException(
        AsyncSocketException::NOT_OPEN,
        "failed to bind the async udp socket for:" + address.describe(),
        errno);
  }

  // Success
  g.dismiss();
  fd_ = socket;
  ownership_ = FDOwnership::OWNS;

  // Attach to EventHandler
  EventHandler::changeHandlerFD(fd_);

  if (address.getPort() != 0) {
    localAddress_ = address;
  } else {
    localAddress_.setFromLocalAddress(fd_);
  }
}

void AsyncUdpSocket::setFD(int fd, FDOwnership ownership) {
  CHECK_EQ(-1, fd_) << "Already bound to another FD";

  fd_ = fd;
  ownership_ = ownership;

  EventHandler::changeHandlerFD(fd_);
  localAddress_.setFromLocalAddress(fd_);
}

ssize_t AsyncUdpSocket::write(
    const folly::SocketAddress& address,
    const std::unique_ptr<folly::IOBuf>& buf) {
  // UDP's typical MTU size is 1500, so a high number of buffers does not make
  // sense. Optimize for buffer chains with buffers smaller than 16
  iovec vec[16];
  size_t iovec_len = buf->fillIov(vec, sizeof(vec) / sizeof(vec[0]));
  if (UNLIKELY(iovec_len == 0)) {
    buf->coalesce();
    vec[0].iov_base = const_cast<uint8_t*>(buf->data());
    vec[0].iov_len = buf->length();
    iovec_len = 1;
  }

  return writev(address, vec, iovec_len);
}

ssize_t AsyncUdpSocket::writev(
    const folly::SocketAddress& address,
    const struct iovec* vec,
    size_t iovec_len) {
  CHECK_NE(-1, fd_) << "Socket not yet bound";

  sockaddr_storage addrStorage;
  address.getAddress(&addrStorage);

  struct msghdr msg;
  msg.msg_name = reinterpret_cast<void*>(&addrStorage);
  msg.msg_namelen = address.getActualSize();
  msg.msg_iov = const_cast<struct iovec*>(vec);
  msg.msg_iovlen = iovec_len;
  msg.msg_control = nullptr;
  msg.msg_controllen = 0;
  msg.msg_flags = 0;

  return ::sendmsg(fd_, &msg, 0);
}

void AsyncUdpSocket::resumeRead(ReadCallback* cob) {
  CHECK(!readCallback_) << "Another read callback already installed";
  CHECK_NE(-1, fd_) << "UDP server socket not yet bind to an address";

  readCallback_ = CHECK_NOTNULL(cob);
  if (!updateRegistration()) {
    AsyncSocketException e(
        AsyncSocketException::NOT_OPEN, "failed to register for accept events");

    readCallback_ = nullptr;
    cob->onReadError(e);
    return;
  }
}

void AsyncUdpSocket::pauseRead() {
  // It is fine to pause an already paused socket
  readCallback_ = nullptr;
  updateRegistration();
}

void AsyncUdpSocket::close() {
  DCHECK(eventBase_->isInEventBaseThread());

  if (readCallback_) {
    auto cob = readCallback_;
    readCallback_ = nullptr;

    cob->onReadClosed();
  }

  // Unregister any events we are registered for
  unregisterHandler();

  if (fd_ != -1 && ownership_ == FDOwnership::OWNS) {
    ::close(fd_);
  }

  fd_ = -1;
}

void AsyncUdpSocket::handlerReady(uint16_t events) noexcept {
  if (events & EventHandler::READ) {
    DCHECK(readCallback_);
    handleRead();
  }
}

void AsyncUdpSocket::handleRead() noexcept {
  void* buf{nullptr};
  size_t len{0};

  struct msghdr* msg{nullptr};

  readCallback_->getMessageHeader(&msg);

  if (msg == nullptr) {
    AsyncSocketException e(
        AsyncSocketException::BAD_ARGS,
        "AsyncUdpSocket::getMessageHeader() returned empty header");

    auto cob = readCallback_;
    readCallback_ = nullptr;

    cob->onReadError(e);
    updateRegistration();
    return;
  }

  ssize_t bytesRead = ::recvmsg(fd_, msg, MSG_DONTWAIT);

  if (bytesRead >= 0) {
    readCallback_->onMessageAvailable(bytesRead);
  } else {
    if (errno == EAGAIN || errno == EWOULDBLOCK || errno == EINTR) {
      // No data could be read without blocking the socket
      return;
    }

    AsyncSocketException e(
        AsyncSocketException::INTERNAL_ERROR, "::recvmsg() failed", errno);

    // In case of UDP we can continue reading from the socket even if the
    // current request fails. We notify the user to take action through logging
    // or stats collection
    auto cob = readCallback_;
    readCallback_ = nullptr;

    cob->onReadError(e);
    updateRegistration();
  }
}

bool AsyncUdpSocket::updateRegistration() noexcept {
  uint16_t flags = NONE;

  if (readCallback_) {
    flags |= READ;
  }

  return registerHandler(flags | PERSIST);
}

} // namespace gorilla
} // namespace facebook
