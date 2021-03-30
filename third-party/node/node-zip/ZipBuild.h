// (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

#pragma once

#include <nan.h>
#include <zipstorage/zipstorage.h>
#include <cstdint>
#include <vector>

namespace facebook {
namespace node_zip {

class ZipBuild : public Nan::ObjectWrap {
 public:
  static NAN_MODULE_INIT(init);
  ~ZipBuild() = default;

 private:
  ZipBuild(const char* path) : zip{path} {}

  static NAN_METHOD(constructor);
  static NAN_METHOD(add);
  static NAN_METHOD(append);
  static NAN_METHOD(writeAndClose);

  void addEntry(
      const char* sourcePath,
      const char* entryName,
      uint8_t level = zipstorage::WriteAccess::DEFAULT_COMPRESSION_LEVEL);
  inline void
  addFile(const char* sourcePath, const char* entryName, uint8_t level) {
    zip.addFile(sourcePath, entryName, level);
  }
  void addLink(const char* sourcePath, const char* entryName, uint16_t mode);
  void addDir(const char* sourcePath, const char* entryName, uint8_t level);
  void appendZip(const char* sourcePath, const char* prefix);

  zipstorage::WriteAccess zip;
  std::vector<zipstorage::ReadAccess> appended;
};

} // namespace node_zip
} // namespace facebook
