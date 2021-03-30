/**
 * Copyright (c) 2014-present, Facebook, Inc.
 */
export type Message = {
  topic: string,
  value: string,
  offset: number,
  partition: number,
  key: string,
  timestamp: string,
};
