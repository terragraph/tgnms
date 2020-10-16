/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

export function objectEntriesTypesafe<T, K>(object: {[T]: K}): Array<[T, K]> {
  return ((Object.entries(object): any): Array<[T, K]>);
}

export function objectValuesTypesafe<T>(object: {[string]: T}): Array<T> {
  return ((Object.values(object): any): Array<T>);
}

export function convertType<T>(object: any): T {
  return ((object: any): T);
}
