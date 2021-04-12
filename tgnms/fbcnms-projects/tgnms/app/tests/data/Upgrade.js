/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */
import type {
  StructuredBatchType,
  StructuredNodeType,
} from '@fbcnms/tg-nms/app/views/upgrade/NetworkUpgrade';

import type {SoftwareImageType} from '@fbcnms/tg-nms/app/helpers/UpgradeHelpers';
import type {UpgradeGroupReqType} from '@fbcnms/tg-nms/shared/types/Controller';

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

export function mockUpgradeImageArrayData(): Array<$Shape<SoftwareImageType>> {
  return [mockUpgradeImageData()];
}

export function mockUpgradeImageData(): SoftwareImageType {
  return {
    versionNumber: '1',
    fileName: 'testFile',
    uploadedDate: new Date('11/11 /11'),
    name: 'testImage',
    magnetUri: 'testimageURI',
    md5: 'testMd5',
    hardwareBoardIds: ['boardIdTest'],
  };
}
export function mockUpgradeReqData(): UpgradeGroupReqType {
  return {
    ugType: 'NODES',
    nodes: [],
    excludeNodes: [],
    urReq: {
      urType: 'PREPARE_UPGRADE',
      upgradeReqId: 'test',
      md5: 'test',
      imageUrl: 'test',
    },
    timeout: 0,
    skipFailure: false,
    version: 'test',
    skipLinks: [],
    limit: 0,
    retryLimit: 0,
  };
}

export function mockStructuredNodeData(): StructuredNodeType {
  return {
    name: 'testName',
    alive: false,
    siteName: 'testSite',
    popNode: false,
    upgradeStatus: 'testStatus',
    upgradeStatusReason: 'testReason',
    version: 'testVersion',
    nextVersion: 'testVersionNext',
  };
}
