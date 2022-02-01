/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 *
 * Provides an abstracted JSON interface for the sites file.
 * In ANP, users can upload CSV, KML, or KMZ as their sites file.
 */

import * as fs from 'fs';
import {Buffer} from 'buffer';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {FILE_SOURCE, FILE_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {arrayToCsv, csvToArray} from '../../helpers/csvHelpers';
import {getInputFilePath, makeANPDir} from '../files';
import {inputFileRowToInputFile} from '../mappers';
const {network_plan_file} = require('@fbcnms/tg-nms/server/models');
import type {CsvColumn} from '../../helpers/csvHelpers';
import type {
  InputFile,
  SitesFile,
  SitesFileRow,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {Logger} from '../../log';
import type {NetworkPlanFileAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFile';

/**
 * The exact column names of the CSV(https://fburl.com/anp-api-doc-v1)
 *
 */
type CSVRow = {|
  lon: ?string,
  lat: ?string,
  height: ?string,
  type: void | 'CN' | 'DN' | 'POP',
  name: ?string,
|};

const CSV_COLUMNS: Array<CsvColumn<CSVRow>> = [
  {key: 'lat', required: true},
  {key: 'lon', required: true},
  {key: 'type', required: true},
  {key: 'height', required: false},
  {key: 'name', required: false},
];

export default class SitesFileService {
  logger: Logger;
  constructor() {
    const log = require('../../log');
    this.logger = log({filename: __filename});
  }
  async getFile({id}: {id: number}): Promise<SitesFile> {
    const row = await network_plan_file.findByPk(id);
    if (row == null) {
      throw new Error(`File not found: ${id}`);
    }
    const inputFile = row.toJSON();
    const path = getInputFilePath({file: inputFile});
    const fileData = await new Promise((res, rej) => {
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
          return rej(err);
        }

        return res(data);
      });
    });
    // first parse the CSV into the flat CSVRow structure
    const csvRows = await csvToArray<CSVRow>(CSV_COLUMNS, fileData);

    // next map it to the SitesFileRow structure
    const sites = csvRows.map<SitesFileRow>((row, idx) => ({
      location: {
        latitude: parseFloat(row.lat),
        longitude: parseFloat(row.lon),
        altitude: parseFloat(row.height),
        accuracy: 1000,
      },
      name: row.name ?? '',
      type: row.type ?? 'DN',
      id: idx,
    }));
    return {id, sites};
  }

  async createFile({name}: {name: string}): Promise<InputFile> {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Missing name');
    }
    const inputFile = (
      await network_plan_file.create(
        ({
          name: name,
          source: FILE_SOURCE.local,
          role: FILE_ROLE.URBAN_SITE_FILE,
          state: FILE_STATE.uploading,
        }: $Shape<NetworkPlanFileAttributes>),
      )
    ).toJSON();
    await makeANPDir('inputs');
    const path = getInputFilePath({
      file: inputFile,
    });
    const csvString = await arrayToCsv(CSV_COLUMNS, []);
    await new Promise((res, rej) => {
      this.logger.debug(`Writing sites-file to disk: ${path}`);
      fs.writeFile(path, Buffer.from(csvString), err => {
        if (err) {
          this.logger.error(err.message);
          return rej(err.message);
        }
        return res();
      });
    });
    return inputFileRowToInputFile(inputFile);
  }

  /**
   * WARNING - There is no locking, last-in wins.
   */
  async updateFile(sitesFile: SitesFile): Promise<void> {
    const row = await network_plan_file.findByPk(sitesFile.id);
    if (row == null) {
      throw new Error(`File not found: ${sitesFile.id}`);
    }
    const inputFile = row.toJSON();
    const path = getInputFilePath({file: inputFile});
    const rows: Array<CSVRow> = [];
    for (const s of sitesFile.sites) {
      rows.push({
        name: s.name,
        type: s.type,
        lat: (s.location?.latitude ?? 0).toString(),
        lon: (s.location?.longitude ?? 0).toString(),
        height: (s.location?.altitude ?? 0).toString(),
      });
    }
    const csvString = await arrayToCsv(CSV_COLUMNS, rows);
    await new Promise((res, rej) => {
      this.logger.debug(`Writing sites-file to disk: ${path}`);
      fs.writeFile(path, Buffer.from(csvString), err => {
        if (err) {
          this.logger.error(err.message);
          return rej(err.message);
        }
        return res();
      });
    });
  }
}
