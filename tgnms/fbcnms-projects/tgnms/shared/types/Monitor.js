/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @flow strict-local

// Generated by thrift2flow at Thu Feb 21 2019 13:01:24 GMT-0800 (PST)
/* eslint-disable */
export type CounterMapType = { [string]: CounterType };

export type MonitorCommandType =
  | "SET_COUNTER_VALUES"
  | "GET_COUNTER_VALUES"
  | "DUMP_ALL_COUNTER_NAMES"
  | "DUMP_ALL_COUNTER_DATA"
  | "BUMP_COUNTER"
  | "GET_EVENT_LOGS"
  | "LOG_EVENT";
export const MonitorCommandValueMap = {
  SET_COUNTER_VALUES: 1,
  GET_COUNTER_VALUES: 2,
  DUMP_ALL_COUNTER_NAMES: 3,
  DUMP_ALL_COUNTER_DATA: 4,
  BUMP_COUNTER: 5,
  GET_EVENT_LOGS: 6,
  LOG_EVENT: 11
};

export type CounterValueTypeType = "GAUGE" | "COUNTER";
export const CounterValueTypeValueMap = {
  GAUGE: 1,
  COUNTER: 2
};

export type CounterType = {|
  value: number,
  valueType: CounterValueTypeType,
  timestamp: Buffer
|};

export type CounterSetParamsType = {| counters: CounterMapType |};

export type CounterGetParamsType = {| counterNames: string[] |};

export type CounterBumpParamsType = {| counterNames: string[] |};

export type EventLogType = {| category: string, samples: string[] |};

export type MonitorRequestType = {|
  cmd: MonitorCommandType,
  counterSetParams: CounterSetParamsType,
  counterGetParams: CounterGetParamsType,
  counterBumpParams: CounterBumpParamsType,
  eventLog: EventLogType
|};

export type CounterValuesResponseType = {| counters: CounterMapType |};

export type EventLogsResponseType = {| eventLogs: EventLogType[] |};

export type CounterNamesResponseType = {| counterNames: string[] |};

export type PubTypeType = "COUNTER_PUB" | "EVENT_LOG_PUB";
export const PubTypeValueMap = {
  COUNTER_PUB: 1,
  EVENT_LOG_PUB: 2
};

export type MonitorPubType = {|
  pubType: PubTypeType,
  counterPub: CounterValuesResponseType,
  eventLogPub: EventLogType
|};
