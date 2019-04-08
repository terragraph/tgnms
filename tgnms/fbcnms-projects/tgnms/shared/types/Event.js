// @flow

// Generated by thrift2flow at Thu Feb 21 2019 13:01:24 GMT-0800 (PST)
/* eslint-disable */

export type EventCategoryType =
  | "IGNITION"
  | "TOPOLOGY"
  | "UPGRADE"
  | "SCAN"
  | "CONFIG"
  | "TRAFFIC"
  | "STATUS"
  | "DRIVER"
  | "SCHEDULER"
  | "OPENR"
  | "WATCHDOG"
  | "SYSTEM"
  | "FIRMWARE"
  | "ZMQ";
export const EventCategoryValueMap = {
  IGNITION: 100,
  TOPOLOGY: 200,
  UPGRADE: 300,
  SCAN: 400,
  CONFIG: 500,
  TRAFFIC: 600,
  STATUS: 700,
  DRIVER: 800,
  SCHEDULER: 900,
  OPENR: 1000,
  WATCHDOG: 1100,
  SYSTEM: 1200,
  FIRMWARE: 1300,
  ZMQ: 1400
};

export type EventSubcategoryType =
  | "LINK"
  | "NODE"
  | "TOPOLOGY"
  | "ADD_NODE"
  | "DEL_NODE"
  | "EDIT_NODE"
  | "ADD_LINK"
  | "DEL_LINK"
  | "EDIT_LINK"
  | "ADD_SITE"
  | "DEL_SITE"
  | "EDIT_SITE"
  | "IMAGE"
  | "PREPARE"
  | "COMMIT"
  | "TIMEOUT"
  | "REPAIR_FW_RESTART"
  | "REPAIR_NO_FW_RESTART"
  | "REBOOT"
  | "IO"
  | "CMD"
  | "PARSE"
  | "NETLINK";
export const EventSubcategoryValueMap = {
  LINK: 10,
  NODE: 11,
  TOPOLOGY: 12,
  ADD_NODE: 200,
  DEL_NODE: 201,
  EDIT_NODE: 202,
  ADD_LINK: 203,
  DEL_LINK: 204,
  EDIT_LINK: 205,
  ADD_SITE: 206,
  DEL_SITE: 207,
  EDIT_SITE: 208,
  IMAGE: 300,
  PREPARE: 301,
  COMMIT: 302,
  TIMEOUT: 303,
  REPAIR_FW_RESTART: 1000,
  REPAIR_NO_FW_RESTART: 1001,
  REBOOT: 1002,
  IO: 1200,
  CMD: 1201,
  PARSE: 1202,
  NETLINK: 1300
};

export type EventLevelType = "INFO" | "WARNING" | "ERROR" | "FATAL";
export const EventLevelValueMap = {
  INFO: 10,
  WARNING: 20,
  ERROR: 30,
  FATAL: 40
};

export type EventType = {|
  source: string,
  timestamp: Buffer,
  reason: string,
  details: string,
  category: EventCategoryType,
  subcategory: EventSubcategoryType,
  level: EventLevelType
|};
