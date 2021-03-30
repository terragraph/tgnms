// (c) Facebook, Inc. and its affiliates. Confidential and proprietary.

#include <nan.h>

#include "ZipAccess.h"
#include "ZipBuild.h"

namespace facebook {
namespace node_zip {

NAN_MODULE_INIT(init) {
  ZipAccess::init(target);
  ZipBuild::init(target);
}

} // namespace node_zip
} // namespace facebook

NODE_MODULE(zipstorage, facebook::node_zip::init)
