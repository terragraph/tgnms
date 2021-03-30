// (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

#include "ZipAccess.h"

#include <zipstorage/unixattr.h>
#include <limits>
#include <memory>
#include <string>
#include <utility>

#include <iostream>

namespace facebook {
namespace node_zip {

namespace {

namespace unixattr = zipstorage::unixattr;

constexpr uint64_t MAX_SAFE_INTEGER = uint64_t{1} << 53;

template <class T, class... Args>
v8::Local<T> New(Args&&... args) {
  return v8::Local<T>{T::New(v8::Isolate::GetCurrent(), std::forward(args)...)};
}

std::string debugMsg(const char* msg, const char* detail) {
  auto m = std::string{msg};
  if (detail != nullptr) {
    m += ": ";
    m += detail;
  } else {
    m += '.';
  }
  return m;
}

} // namespace

NAN_MODULE_INIT(ZipAccess::init) {
  auto name = Nan::New("ZipAccess").ToLocalChecked();

  auto tpl = Nan::New<v8::FunctionTemplate>(constructor);
  tpl->SetClassName(name);
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(tpl, "entries", entries);
  Nan::SetPrototypeMethod(tpl, "readFile", readFile);

  Nan::Set(target, name, Nan::GetFunction(tpl).ToLocalChecked());
}

NAN_METHOD(ZipAccess::constructor) {
  if (!info.IsConstructCall()) {
    Nan::ThrowTypeError("Constructor ZipAccess requires 'new'");
    return;
  }

  if (!info[0]->IsString()) {
    Nan::ThrowTypeError("ZipAccess() expects a string as first argument.");
    return;
  }

  Nan::Utf8String path{info[0]};
  try {
    auto access = std::make_unique<ZipAccess>(*path);
    access.release()->Wrap(info.This());
  } catch (zipstorage::Error& e) {
    Nan::ThrowError(e.what());
  }
}

NAN_METHOD(ZipAccess::entries) {
  ZipAccess* zipAccess = Nan::ObjectWrap::Unwrap<ZipAccess>(info.Holder());

  auto files = New<v8::Map>();
  auto links = New<v8::Map>();
  zipstorage::ReadAccess& access = zipAccess->access;

  if (access.size() > MAX_SAFE_INTEGER) {
    Nan::ThrowError("Zip has more than 2^53 entries");
    return;
  }

  auto context = Nan::GetCurrentContext();
  try {
    for (auto entry : access) {
      switch (access.unixAttrs(entry.index) & unixattr::mask::TYPE) {
        case unixattr::type::FILE:
          files
              ->Set(
                  context,
                  Nan::New(entry.name).ToLocalChecked(),
                  Nan::New<v8::Number>(entry.index))
              .ToLocalChecked();
          break;
        case unixattr::type::LINK:
          auto buffer = std::make_unique<char[]>(entry.size);
          access.readEntry(entry.index, buffer.get(), entry.size);
          links
              ->Set(
                  context,
                  Nan::New(entry.name).ToLocalChecked(),
                  Nan::New(buffer.get(), entry.size).ToLocalChecked())
              .ToLocalChecked();
          break;
      }
    }
  } catch (zipstorage::Error& e) {
    Nan::ThrowError(e.what());
    return;
  }

  auto entries = Nan::New<v8::Object>();
  auto filesProp = Nan::New("files").ToLocalChecked();
  auto linksProp = Nan::New("links").ToLocalChecked();
  entries->Set(filesProp, files);
  entries->Set(linksProp, links);

  info.GetReturnValue().Set(entries);
}

NAN_METHOD(ZipAccess::readFile) {
  auto entryIndex = Nan::To<int64_t>(info[0]);
  if (!info[0]->IsNumber() || entryIndex.IsNothing()) {
    Nan::ThrowTypeError(
        "ZipAccess.readFile(entry) expects a number as first argument.");
    return;
  }

  ZipAccess* zipAccess = Nan::ObjectWrap::Unwrap<ZipAccess>(info.Holder());
  int64_t index = entryIndex.FromJust();
  if (index < 0 || index >= zipAccess->access.size()) {
    Nan::Utf8String filename{info[1]};
    Nan::ThrowError(Nan::ErrnoException(
        UV_ENOENT,
        "open",
        debugMsg("no such file or directory", *filename).c_str(),
        *filename));
    return;
  }

  try {
    auto entry = zipAccess->access.stat(index);
    if (entry.size > std::numeric_limits<uint32_t>::max()) {
      Nan::ThrowRangeError(
          debugMsg("File size is too large", *Nan::Utf8String{info[1]})
              .c_str());
      return;
    }

    v8::Local<v8::Object> buffer = Nan::NewBuffer(entry.size).ToLocalChecked();
    zipAccess->access.readEntry(
        entry.index, node::Buffer::Data(buffer), entry.size);
    info.GetReturnValue().Set(buffer);
  } catch (zipstorage::Error& e) {
    Nan::ThrowError(e.what());
  }
}

} // namespace node_zip
} // namespace facebook
