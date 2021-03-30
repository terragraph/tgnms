// (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

#pragma once

#include <nan.h>
#include <zipstorage/zipstorage.h>

namespace facebook {
namespace node_zip {

class ZipAccess : public Nan::ObjectWrap {
 public:
  static NAN_MODULE_INIT(init);
  ZipAccess(const char* path) : access(path) {}
  ~ZipAccess() = default;

 private:
  static NAN_METHOD(constructor);
  static NAN_METHOD(entries);
  static NAN_METHOD(readFile);

  zipstorage::ReadAccess access;
};

} // namespace node_zip
} // namespace facebook
