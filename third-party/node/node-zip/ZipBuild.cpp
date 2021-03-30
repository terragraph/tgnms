// (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

#include "ZipBuild.h"

#include <uv.h>
#include <zipstorage/unixattr.h>
#include <stdexcept>

namespace facebook {
namespace node_zip {

namespace {

namespace unixattr = zipstorage::unixattr;

std::string uv_error(int code) {
  std::string message{uv_err_name(code)};
  message += ' ';
  message += uv_strerror(code);
  return message;
}

std::string file_type_error(const char* filename) {
  std::string message = filename;
  message += " is not a regular file or a symlink.";
  return message;
}

class UVError : public std::runtime_error {
 public:
  UVError(int code) : std::runtime_error(uv_error(code)){};
};

class FileTypeError : public std::invalid_argument {
 public:
  FileTypeError(const char* sourcePath)
      : std::invalid_argument(file_type_error(sourcePath)){};
};

inline bool canArchive(uv_dirent_type_t type) {
  return (
      type == UV_DIRENT_FILE || type == UV_DIRENT_DIR ||
      type == UV_DIRENT_LINK ||
      type ==
          UV_DIRENT_UNKNOWN // some file systems on linux only support unknown
  );
}

} // namespace

NAN_MODULE_INIT(ZipBuild::init) {
  auto name = Nan::New("ZipBuild").ToLocalChecked();

  v8::Local<v8::FunctionTemplate> tpl =
      Nan::New<v8::FunctionTemplate>(constructor);
  tpl->SetClassName(name);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tpl, "add", add);
  Nan::SetPrototypeMethod(tpl, "append", append);
  Nan::SetPrototypeMethod(tpl, "writeAndClose", writeAndClose);
  Nan::Set(target, name, Nan::GetFunction(tpl).ToLocalChecked());
}

NAN_METHOD(ZipBuild::constructor) {
  if (!info.IsConstructCall()) {
    Nan::ThrowTypeError("Constructor ZipBuild requires 'new'");
    return;
  }

  if (!info[0]->IsString()) {
    Nan::ThrowTypeError("ZipBuild() expects a string as first parameter.");
    return;
  }

  Nan::Utf8String path{info[0]};
  try {
    auto build = new ZipBuild{*path};
    build->Wrap(info.This());
  } catch (zipstorage::Error& e) {
    Nan::ThrowError(e.what());
    return;
  }
}

NAN_METHOD(ZipBuild::add) {
  if (!info[0]->IsString() || !info[1]->IsString()) {
    Nan::ThrowTypeError(
        "add(sourcePath, entryName) must be called with two strings.");
    return;
  }

  ZipBuild* zipBuild = Nan::ObjectWrap::Unwrap<ZipBuild>(info.Holder());
  Nan::Utf8String sourcePath{info[0]};
  Nan::Utf8String entryName{info[1]};
  uint8_t compressionLevel = zipstorage::WriteAccess::DEFAULT_COMPRESSION_LEVEL;
  if (info.Length() > 2) {
    auto level = Nan::To<int32_t>(info[2]);
    compressionLevel = level.FromMaybe(compressionLevel);
  }

  try {
    zipBuild->addEntry(*sourcePath, *entryName, compressionLevel);
  } catch (zipstorage::Error& e) {
    Nan::ThrowError(e.what());
  } catch (UVError& e) {
    Nan::ThrowError(e.what());
  } catch (FileTypeError& e) {
    Nan::ThrowError(e.what());
  }
}

NAN_METHOD(ZipBuild::append) {
  if (!info[0]->IsString()) {
    Nan::ThrowTypeError(
        "append() must be called with a string as first argument.");
    return;
  }

  ZipBuild* zipBuild = Nan::ObjectWrap::Unwrap<ZipBuild>(info.Holder());
  Nan::Utf8String inputZip{info[0]};

  std::unique_ptr<Nan::Utf8String> prefix;
  if (info[1]->IsString()) {
    prefix = std::make_unique<Nan::Utf8String>(info[1]);
  } else if (info.Length() > 1 && !info[1]->IsNullOrUndefined()) {
    Nan::ThrowTypeError(
        "append() must be called with a string or null/undefined as "
        "second argument.");
    return;
  }

  try {
    zipBuild->appendZip(*inputZip, prefix ? **prefix : nullptr);
  } catch (zipstorage::Error& e) {
    Nan::ThrowError(e.what());
  }
}

NAN_METHOD(ZipBuild::writeAndClose) {
  ZipBuild* zipBuild = Nan::ObjectWrap::Unwrap<ZipBuild>(info.Holder());
  try {
    zipBuild->zip.writeAndClose();
  } catch (zipstorage::Error& e) {
    Nan::ThrowError(e.what()); // does not exit the method
  }

  // release zipstorage::Access instances used for the build
  zipBuild->appended.clear();
}

void ZipBuild::addEntry(
    const char* sourcePath,
    const char* entryName,
    uint8_t compressionLevel) {
  uv_fs_t request;
  int result = uv_fs_lstat(uv_default_loop(), &request, sourcePath, nullptr);
  if (result < 0) {
    throw UVError(result);
  }

  switch (request.statbuf.st_mode & unixattr::mask::TYPE) {
    case unixattr::type::FILE:
      addFile(sourcePath, entryName, compressionLevel);
      break;
    case unixattr::type::LINK:
      addLink(
          sourcePath,
          entryName,
          request.statbuf.st_mode & unixattr::mask::MODE);
      break;
    case unixattr::type::DIR:
      addDir(sourcePath, entryName, compressionLevel);
      break;
    default:
      throw FileTypeError(sourcePath);
  }
}

void ZipBuild::addLink(
    const char* sourcePath,
    const char* entryName,
    uint16_t mode) {
  uv_fs_t request;
  int result = uv_fs_readlink(uv_default_loop(), &request, sourcePath, nullptr);
  if (result < 0) {
    throw UVError(result);
  }
  zip.addLink(static_cast<const char*>(request.ptr), entryName, mode);
}

void ZipBuild::addDir(
    const char* sourcePath,
    const char* entryName,
    uint8_t compressionLevel) {
  uv_fs_t request;
  int result =
      uv_fs_scandir(uv_default_loop(), &request, sourcePath, 0, nullptr);
  if (result < 0) {
    throw UVError(result);
  }

  std::string sourceDir = sourcePath;
  sourceDir += '/';
  std::string entryDir = entryName;
  if (entryDir.size()) {
    entryDir += '/';
  }

  uv_dirent_t ent;
  int r;
  while ((r = uv_fs_scandir_next(&request, &ent)) != UV_EOF) {
    if (r < 0) {
      throw UVError{r};
    }
    if (canArchive(ent.type)) {
      std::string inputEntryPath = sourceDir + ent.name;
      std::string archiveEntry = entryDir + ent.name;
      addEntry(inputEntryPath.c_str(), archiveEntry.c_str(), compressionLevel);
    }
  }
}

void ZipBuild::appendZip(const char* sourcePath, const char* prefix) {
  appended.emplace_back(sourcePath);
  zip.append(appended.back(), prefix);
}

} // namespace node_zip
} // namespace facebook
