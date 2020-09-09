/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {E2EController} from '../NetworkState';

export class NetworkDto {
  name: string;
  backup: ?E2EController;
  controller_online: boolean;
  primary: E2EController;
  site_overrides: Object;

  constructor(init: $ReadOnly<NetworkDto>) {
    this.name = init.name;
    this.backup = init.backup;
    this.controller_online = init.controller_online;
    this.primary = init.primary;
    this.site_overrides = init.site_overrides;
  }
}

export type VersionDto = {
  node_env: string,
  commit_date: string,
  commit_hash: string,
  version: string,
};

export type DiffDto = {
  commit: string,
  author: string,
  date: string,
  title: string,
};

export type ChangelogDto = {[key: string]: Array<DiffDto>};
