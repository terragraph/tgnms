namespace cpp2 facebook.terragraph.thrift
namespace py terragraph_thrift.Aggregator

include "Lsdb.thrift"
include "IpPrefix.thrift"

enum AggrMessageType {

  // ===  StatusApp  === //
  // Requests handled (by Aggr StatusApp)
  GET_STATUS_DUMP = 101,
  GET_ROUTING_ADJ = 102,
  // Responses given (by Aggr StatusApp)
  STATUS_DUMP = 201,
  ROUTING_ADJ = 202,
  // Messages originated (by agent)
  STATUS_REPORT = 401,
}

#############  StatusApp ##############

struct AggrGetStatusDump {}

struct AggrStatusDump {
  1: map<string /* node id */, Lsdb.AdjacencyDatabase> adjacencyMap;
  2: map<string /* node id */, AggrStatusReport> statusReports;
}

struct AggrStatusReport {
  1: i64 timeStamp;  // timestamp at which this response was generated
  2: string ipv6Address;
  3: list<IpPrefix.UnicastRoute> routes;
}

############# Common #############

struct AggrMessage {
  1: AggrMessageType mType;
  2: binary value;
}
