/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import type {
  StructuredBatchType,
  StructuredNodeType,
} from '../../views/upgrade/NetworkUpgrade';

export function mockUpgradeArrayData(): Array<StructuredNodeType> {
  return [
    {
      name: 'test1',
      alive: true,
      siteName: 'testSite',
      popNode: false,
      upgradeStatus: null,
      upgradeStatusReason: null,
      version: null,
      nextVersion: null,
    },
    {
      name: 'test2',
      alive: true,
      siteName: 'testSite',
      popNode: false,
      upgradeStatus: null,
      upgradeStatusReason: null,
      version: null,
      nextVersion: null,
    },
    {
      name: 'test3',
      alive: true,
      siteName: 'testSite',
      popNode: false,
      upgradeStatus: null,
      upgradeStatusReason: null,
      version: null,
      nextVersion: null,
    },
    {
      name: 'test4',
      alive: true,
      siteName: 'testSite',
      popNode: false,
      upgradeStatus: null,
      upgradeStatusReason: null,
      version: null,
      nextVersion: null,
    },
  ];
}

export function mockBatchArrayData(): Array<StructuredBatchType> {
  return [
    {
      name: 'test1',
      upgradeStatus: null,
      upgradeReqId: null,
      version: null,
      nextVersion: null,
    },
    {
      name: 'test2',
      upgradeStatus: null,
      upgradeReqId: null,
      version: null,
      nextVersion: null,
    },
    {
      name: 'test3',
      upgradeStatus: null,
      upgradeReqId: null,
      version: null,
      nextVersion: null,
    },
  ];
}

export function mockBatchData(
  overrides?: $Shape<StructuredBatchType>,
): StructuredBatchType {
  const defaultBatch: $Shape<StructuredBatchType> = {
    name: 'test1',
    upgradeStatus: null,
    upgradeReqId: null,
    version: null,
    nextVersion: null,
  };
  return Object.assign(defaultBatch, overrides || {});
}
