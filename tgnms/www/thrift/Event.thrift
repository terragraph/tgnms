namespace py terragraph_thrift.Event
namespace cpp facebook.terragraph.thrift

enum EventCategory {
  IGNITION = 100,
  TOPOLOGY = 200,
  UPGRADE = 300,
  SCAN = 400,
  CONFIG = 500,
  TRAFFIC = 600,
  STATUS = 700,
  DRIVER = 800,
  SCHEDULER = 900,
  OPENR = 1000,
  WATCHDOG = 1100,
  SYSTEM = 1200,
  FIRMWARE = 1300,
  ZMQ = 1400,
}

enum EventSubcategory {
  // == GENERAL === //
  LINK = 10,
  NODE = 11,
  TOPOLOGY = 12,
  // === TOPOLOGY === //
  ADD_NODE = 200,
  DEL_NODE = 201,
  EDIT_NODE = 202,
  ADD_LINK = 203,
  DEL_LINK = 204,
  EDIT_LINK = 205,
  ADD_SITE = 206,
  DEL_SITE = 207,
  EDIT_SITE = 208,
  // === UPGRADE === //
  IMAGE = 300,
  PREPARE = 301,
  COMMIT = 302,
  TIMEOUT = 303,
  // == WATCHDOG == //
  REPAIR_FW_RESTART = 1000,
  REPAIR_NO_FW_RESTART = 1001,
  REBOOT = 1002,
  // === SYSTEM === //
  IO = 1200,
  CMD = 1201,
  PARSE = 1202,
  // === FIRMWARE === //
  NETLINK = 1300,
}

enum EventLevel {
  INFO = 10,
  WARNING = 20,
  ERROR = 30,
  FATAL = 40,
}

struct Event {
  1: string source; // zmq identity, process, or filename of the Event creator.
  2: i64 timestamp; // unix time in seconds
  3: string reason; // human readable explanation/description
  4: string details; // json formated string of extra details
  5: EventCategory category;
  6: EventSubcategory subcategory;
  7: EventLevel level;
}
