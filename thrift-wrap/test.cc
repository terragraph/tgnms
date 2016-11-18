#include <node.h>
#include <node_buffer.h>
#include <iostream>

//#include <thrift/protocol/TBinaryProtocol.h>
//#include <thrift/lib/cpp/protocol/TCompactProtocol.h>
//#include <thrift/transport/TSocket.h>
#include <thrift/lib/cpp2/protocol/Serializer.h>
//#include <thrift/transport/TTransportUtils.h>
#include "../thrift/gen-cpp2/Controller_types.h"
#include "../thrift/gen-cpp2/Topology_types.h"

namespace test {

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;
using apache::thrift::CompactSerializer;
using namespace facebook::terragraph;

void GetTopologyReq(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
	auto serializer = CompactSerializer();
  // create and serialize topology message
  thrift::GetTopology getTopologyMsg;
  std::string topoMsg;
  serializer.serialize(getTopologyMsg, &topoMsg);
  // create thrift message
  thrift::Message tMsg;
  tMsg.mType = thrift::MessageType::GET_TOPOLOGY;
  tMsg.value = topoMsg;
  // serialize
  std::string sMsg;
  serializer.serialize(tMsg, &sMsg);
  // copy back into the buffer until I figure out a utf8 solution
  char* buffer = (char*) node::Buffer::Data(args[0]->ToObject());
  strcpy(buffer, sMsg.c_str());
}

void GetTopologyJson(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  // copy from args
  v8::String::Utf8Value jsonArg(args[0]);
  auto serializer = CompactSerializer();
  std::string sBuffer(*jsonArg, args[0]->ToString()->Length());
  LOG(INFO) << "sBuffer len: " << sBuffer.length();
  LOG(INFO) << sBuffer;
  thrift::Topology topo;
  serializer.deserialize(sBuffer, topo);
  LOG(INFO) << "Topo: " << topo.name << ", nodes: " << topo.nodes.size() << ", links: " << topo.links.size() << ", sites: " << topo.sites.size();
  args.GetReturnValue().Set(String::NewFromUtf8(isolate, "world"));
  // decode object
}

void init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "getTopologyReq", GetTopologyReq);
  NODE_SET_METHOD(exports, "getTopologyJson", GetTopologyJson);
}

NODE_MODULE(test, init)

}
