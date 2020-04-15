/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

type ControllerDto = {
  api_ip: string,
  api_port: number,
  e2e_ip: ?string,
  e2e_port: number,
  id: number,
};

export class NetworkDto {
  name: string;
  backup: ControllerDto;
  controller_online: boolean;
  primary: ControllerDto;
  prometheus_online: boolean;
  site_overrides: Object;

  constructor(init: $ReadOnly<NetworkDto>) {
    this.name = init.name;
    this.backup = init.backup;
    this.controller_online = init.controller_online;
    this.primary = init.primary;
    this.prometheus_online = init.prometheus_online;
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
