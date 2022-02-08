/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

const {
  network_plan,
  network_plan_folder,
  network_plan_file,
} = require('@fbcnms/tg-nms/server/models');
const mv = require('mv');
import * as fs from 'fs';
import ANPAPIClient from '@fbcnms/tg-nms/server/network_plan/ANPAPIClient';
import {DEFAULT_FILE_UPLOAD_CHUNK_SIZE} from '@fbcnms/tg-nms/shared/dto/FacebookGraph';
import {
  FILE_ROLE,
  INPUT_FILE_STATE,
  PLAN_STATUS,
} from '@fbcnms/tg-nms/shared/dto/ANP';
import {
  FILE_SOURCE,
  FILE_STATE,
  LAUNCHING_NETWORK_PLAN_STATES,
  NETWORK_PLAN_STATE,
  RUNNING_NETWORK_PLAN_STATES,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {NodeTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {
  checkPathExists,
  getInputFilePath,
  makeANPDir,
} from '@fbcnms/tg-nms/server/network_plan/files';
import {
  folderRowToFolder,
  inputFileRowToInputFile,
  planRowToNetworkPlan,
} from '@fbcnms/tg-nms/server/network_plan/mappers';
import {getInputFileFields} from '@fbcnms/tg-nms/server/models/networkPlan';
import {loadProfiles} from '@fbcnms/tg-nms/server/hwprofile/hwprofile';
import {pollConditionally} from '@fbcnms/tg-nms/server/helpers/poll';
import type {
  ANPFileHandle,
  FileRoles,
  MeshPlannerDeviceParams,
} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {
  CreateNetworkPlanRequest,
  CreatePlanFolderRequest,
  InputFile,
  LaunchPlanResult,
  NetworkPlan,
  PlanFolder,
  UpdateNetworkPlanRequest,
  UpdatePlanFolderRequest,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {
  HardwareProfile,
  HardwareProfiles,
} from '@fbcnms/tg-nms/shared/dto/HardwareProfiles';
import type {IncludeOptions} from 'sequelize';
import type {NetworkPlanAttributes} from '@fbcnms/tg-nms/server/models/networkPlan';
import type {NetworkPlanFileAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFile';
import type {NetworkPlanFolderAttributes} from '@fbcnms/tg-nms/server/models/networkPlanFolder';
import type {NetworkPlanStateType} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

export default class PlanningService {
  anpApi: ANPAPIClient;
  hardwareProfiles: HardwareProfiles;
  constructor({anpApi}: {anpApi: ANPAPIClient}) {
    this.anpApi = anpApi;
    this._initHardwareProfiles();
  }
  async getFolders(): Promise<Array<PlanFolder>> {
    const folders = await network_plan_folder.findAll();
    return (folders ?? []).map(row => folderRowToFolder(row.toJSON()));
  }
  async getFolder({id}: {id: number}): Promise<?PlanFolder> {
    const folder = await network_plan_folder.findByPk(id);
    if (folder == null) {
      return null;
    }
    return folderRowToFolder(folder.toJSON());
  }
  //Creates an ANP folder then logs it to the DB
  async createFolder(req: CreatePlanFolderRequest): Promise<PlanFolder> {
    const anpFolder = await this.anpApi.createFolder({folder_name: req.name});
    const dbFolder = await network_plan_folder.create(
      ({
        name: req.name,
        fbid: anpFolder.id,
      }: $Shape<NetworkPlanFolderAttributes>),
    );
    return folderRowToFolder(dbFolder.toJSON());
  }
  // renames the folder in the DB, does not rename it in ANP
  async updateFolder(req: UpdatePlanFolderRequest) {
    const dbFolder = await network_plan_folder.findByPk(req.id);
    if (dbFolder == null) {
      throw new Error('folder not found');
    }
    if (req.name == null || req.name.trim() === '') {
      throw new Error('name is required');
    }
    dbFolder.name = req.name;
    await dbFolder.save();
    return folderRowToFolder(dbFolder.toJSON());
  }

  /** Deletes a folder only if it has no more plans. */
  async deleteFolder({id}: {id: number}) {
    const planRows = await network_plan.findAll({
      where: {folder_id: id},
    });
    if (planRows.length) {
      // Delete all the plans. This needs to happen before file deletion
      // to prevent race conditions.
      await network_plan.destroy({where: {folder_id: id}});

      // Delete all the files.
      const fileIds = planRows.reduce((res, plan) => {
        if (plan.boundary_file_id) res.add(plan.boundary_file_id);
        if (plan.sites_file_id) res.add(plan.sites_file_id);
        if (plan.dsm_file_id) res.add(plan.dsm_file_id);
        return res;
      }, new Set<number>([]));
      await Promise.all(
        Array.from(fileIds).map(id => this.deleteInputFile({id})),
      );
    }
    const folderRow = await network_plan_folder.findByPk(id);
    if (folderRow == null) {
      return null;
    }
    // delete the plan row
    await folderRow.destroy();
  }

  async createNetworkPlan(req: CreateNetworkPlanRequest): Promise<NetworkPlan> {
    const result = await network_plan.create(
      ({
        folder_id: req.folderId,
        name: req.name,
        state: NETWORK_PLAN_STATE.DRAFT,
        dsm_file_id: req.dsmFileId,
        boundary_file_id: req.boundaryFileId,
        sites_file_id: req.sitesFileId,
        hardware_board_ids: req.hardwareBoardIds,
      }: $Shape<NetworkPlanAttributes>),
    );
    const created = await network_plan.findByPk(result.id, {
      include: includeInputFiles(),
    });
    if (created == null) {
      throw new Error('Could not find created plan with id: ' + result.id);
    }
    return planRowToNetworkPlan(created.toJSON());
  }

  async updateNetworkPlan(req: UpdateNetworkPlanRequest): Promise<NetworkPlan> {
    console.dir(req);
    await network_plan.update(
      {
        name: req.name,
        dsm_file_id: req.dsmFileId,
        boundary_file_id: req.boundaryFileId ?? null,
        sites_file_id: req.sitesFileId ?? null,
        hardware_board_ids: req.hardwareBoardIds ?? null,
      },
      {where: {id: req.id}},
    );
    const updated = await network_plan.findByPk(req.id, {
      include: includeInputFiles(),
    });
    if (updated == null) {
      throw new Error('Could not find updated plan with id: ' + req.id);
    }
    return planRowToNetworkPlan(updated.toJSON());
  }

  /**
   * Deletes the plan from the local db and any input files stored locally.
   * Note: this does not delete the plan from ANP; ANP should handle their
   * own retention separately from NMS.
   */
  async deleteNetworkPlan({id}: {id: number}) {
    const planRow = await network_plan.findByPk(id);
    if (planRow == null) {
      return null;
    }
    // We need to delete the plan first to remove it's references
    // to the input files.
    await planRow.destroy();

    // We attempt to delete the input files if no other plan
    // references them.
    const calls = [];
    if (planRow.boundary_file_id)
      calls.push(
        this.deleteInputFile({
          id: planRow.boundary_file_id,
        }),
      );
    if (planRow.sites_file_id)
      calls.push(
        this.deleteInputFile({
          id: planRow.sites_file_id,
        }),
      );
    if (planRow.dsm_file_id)
      calls.push(this.deleteInputFile({id: planRow.dsm_file_id}));

    await Promise.all(calls);
  }

  async cancelNetworkPlan(id: number): Promise<{success: boolean}> {
    const planRow = await network_plan.findByPk(id);
    if (planRow == null) {
      throw new Error('Plan not found');
    }
    if (planRow.fbid == null) {
      throw new Error('Plan not launched');
    }
    const cancelResult = await this.anpApi.cancelPlan({id: planRow.fbid});
    // once the plan is canceled in ANP, update the DB with the new state
    await this.syncANPPlan(id);
    return cancelResult;
  }

  /**
   * Upload draft input files and launch the plan.
   * if there are no drafts, launch the plan
   */
  async startLaunchPlan({id}: {id: number}): Promise<LaunchPlanResult> {
    const planRow = await network_plan.findByPk(id, {
      include: [...includeInputFiles(), ...includeFolder()],
    });
    if (planRow == null) {
      throw new Error('Plan not found');
    }
    const plan = planRow.toJSON();
    if (plan.folder == null) {
      throw new Error('No folder associated with plan');
    }
    try {
      if (plan.name == null || plan.name.trim() === '') {
        return {
          message: 'Plan failed validation',
          state: NETWORK_PLAN_STATE.ERROR,
          errors: [{message: `Invalid plan name: "${plan.name}"`}],
        };
      }

      // this is only for flow
      if (!(plan.dsm_file && plan.boundary_file && plan.sites_file)) {
        const errors = [];
        if (plan.dsm_file == null) {
          errors.push({message: 'Missing DSM file'});
        }
        if (plan.boundary_file == null) {
          errors.push({message: 'Missing boundary file'});
        }
        if (plan.sites_file == null) {
          errors.push({message: 'Missing sites file'});
        }
        return {
          message: 'Plan failed validation',
          state: NETWORK_PLAN_STATE.ERROR,
          errors,
        };
      }

      // input files
      const hasDraftInputs = [
        plan.dsm_file,
        plan.boundary_file,
        plan.sites_file,
      ].some(file => file.source === FILE_SOURCE.local);
      if (hasDraftInputs) {
        await this.setPlanState(plan.id, NETWORK_PLAN_STATE.UPLOADING_INPUTS);
        await this.uploadDraftInputFiles({id: plan.id});
      }
      // finally, create and launch the plan
      return this.launchANPPlan({id: plan.id});
    } catch (err) {
      await this.setPlanState(plan.id, NETWORK_PLAN_STATE.ERROR);
      return {
        message: 'Failed to launch plan',
        state: NETWORK_PLAN_STATE.ERROR,
        errors: [{message: err.message}],
      };
    }
  }

  /**
   * Upload all draft input files to ANP before launching the plan
   */
  async uploadDraftInputFiles({id}: {id: number}): Promise<void> {
    const planRow = await network_plan.findByPk(id);
    if (planRow == null) {
      throw new Error('Plan not found');
    }
    const plan = planRow.toJSON();

    const inputFileIds = getPlanInputFileIds(plan);
    // lookup all LOCAL input files for the plan
    const inputFiles = (
      await network_plan_file.findAll({
        where: {id: inputFileIds, source: 'local'},
      })
    ).map(i => i.toJSON());

    await Promise.all(
      inputFiles.map(async inputFile => {
        const localFilePath = getInputFilePath({file: inputFile});
        let fd;
        try {
          fd = await new Promise((res, rej) => {
            fs.open(localFilePath, 'r', (err, fd) => {
              if (err) {
                return rej(err);
              }
              return res(fd);
            });
          });
          const stats = await new Promise((res, rej) => {
            fs.stat(localFilePath, (err, stats) => {
              if (err) {
                return rej(err);
              }
              return res(stats);
            });
          });

          const anpFile = await this.uploadANPFile({
            name: inputFile.name,
            role: inputFile.role,
            fileSize: stats.size,
            fileDescriptor: fd,
          });
          await network_plan_file.update(
            {fbid: anpFile.id, source: 'fbid'},
            {
              where: {id: inputFile.id},
            },
          );
          await this.waitForFileReadyState(anpFile);
        } catch (err) {
          throw err;
        } finally {
          if (fd != null) {
            fs.close(fd, err => {
              if (err) {
                console.error(err);
              }
            });
          }
        }
      }),
    );
  }

  /**
   * Creates and launches the plan in the ANP API
   */
  async launchANPPlan({id}: {id: number}) {
    const planRow = await network_plan.findByPk(id, {
      include: [...includeInputFiles(), ...includeFolder()],
    });
    if (planRow == null) {
      throw new Error('Plan not found');
    }
    const plan = planRow.toJSON();
    if (
      plan.folder == null ||
      plan.boundary_file?.fbid == null ||
      plan.dsm_file?.fbid == null ||
      plan.sites_file?.fbid == null
    ) {
      throw new Error('Plan failed validation');
    }
    try {
      let hardware_profile_fbid: ?string = null;
      if (
        plan.hardware_board_ids != null &&
        plan.hardware_board_ids.length > 0
      ) {
        // an error will be thrown if this fails
        const hwFile = await this._tryUploadHardwareProfiles({
          profiles: plan.hardware_board_ids,
        });
        hardware_profile_fbid = hwFile.id;
      }

      const anpPlan = await this.anpApi.createPlan({
        folder_id: plan.folder.fbid,
        plan_name: plan.name,
        boundary_polygon: plan.boundary_file.fbid,
        dsm: plan.dsm_file.fbid,
        site_list: plan.sites_file.fbid,
        device_list_file: hardware_profile_fbid,
      });
      if (anpPlan.id == null || anpPlan.id == '') {
        throw new Error('Create plan failed');
      }
      const launchResult = await this.anpApi.launchPlan({id: anpPlan.id});
      if (launchResult.success === false) {
        throw new Error('Launch plan failed');
      }
      planRow.fbid = anpPlan.id;
      await planRow.save();
      await this.setPlanState(plan.id, NETWORK_PLAN_STATE.RUNNING);
      return {
        state: NETWORK_PLAN_STATE.RUNNING,
      };
    } catch (err) {
      const errors = [];
      console.error(err);
      const apiMsg = err.response?.data?.error?.message;
      if (apiMsg != null) {
        errors.push(apiMsg);
      }
      planRow.state = NETWORK_PLAN_STATE.LAUNCH_ERROR;
      await planRow.save();
      return {state: planRow.state, message: err.message, errors};
    }
  }

  uploadANPFile({
    name,
    role,
    fileSize,
    uploadChunkSize,
    fileDescriptor,
  }: {
    fileDescriptor: number,
    fileSize: number,
    name: string,
    role: FileRoles,
    // used for testing
    uploadChunkSize?: number,
  }): Promise<ANPFileHandle> {
    return this._baseANPChunkedUpload({
      name,
      role,
      uploadChunkSize,
      fileSize,
      genChunk: ({length, offset}) => {
        return new Promise((res, rej) => {
          fs.read(
            fileDescriptor,
            Buffer.alloc(length),
            0, // write to start of buffer
            length,
            offset,
            (err, bytesRead, buffer) => {
              if (err) {
                return rej(err);
              }
              return res(buffer);
            },
          );
        });
      },
    });
  }

  /**
   * Upload a string (such as JSON or CSV) instead of a file from the disk.
   */
  uploadANPString({
    name,
    role,
    uploadChunkSize,
    data,
  }: {
    data: string,
    name: string,
    role: FileRoles,
    // used for testing
    uploadChunkSize?: number,
  }): Promise<ANPFileHandle> {
    const buffer = Buffer.from(data);
    return this._baseANPChunkedUpload({
      name,
      role,
      uploadChunkSize,
      fileSize: buffer.byteLength,
      genChunk: ({length, offset}) => {
        return Promise.resolve(buffer.subarray(offset, offset + length));
      },
    });
  }

  async _baseANPChunkedUpload({
    name,
    role,
    fileSize,
    uploadChunkSize,
    genChunk,
  }: {
    genChunk: ({length: number, offset: number}) => Promise<Buffer>,
    name: string,
    role: FileRoles,
    fileSize: number,
    // used for testing
    uploadChunkSize?: number,
  }): Promise<ANPFileHandle> {
    const chunkSize =
      uploadChunkSize != null && uploadChunkSize > 0
        ? uploadChunkSize
        : DEFAULT_FILE_UPLOAD_CHUNK_SIZE;
    // convert common file extensions into mime types
    const fileTypeMapping = {
      tif: 'image/tiff',
      tiff: 'image/tiff',
      kml: 'application/vnd.google-earth.kml+xml',
      csv: 'application/csv',
      json: 'application/json',
    };

    const fileName = name.slice(0, name.indexOf('.'));
    const extension = name.slice(name.lastIndexOf('.') + 1);
    const mimeType = fileTypeMapping[extension];
    if (!mimeType) {
      throw new Error(
        `Error: ${name}. Could determine mime-type from extension: ${extension}`,
      );
    }

    // file upload session id - all chunks must reference this
    const {id: uploadHandle} = await this.anpApi.createUploadSession({
      file_length: fileSize,
      // must be a standard mime type
      file_type: mimeType,
      file_name: fileName,
    });
    const numChunks = Math.floor(fileSize / chunkSize) + 1;
    const lastChunkIdx = numChunks - 1;
    let fileId = null;

    for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
      const offset = chunkIdx * chunkSize;
      let length = chunkSize;
      if (offset + length > fileSize) {
        length = fileSize - offset;
      }
      const chunkData = await genChunk({length, offset});
      const chunkResponse = await this.anpApi.uploadChunk({
        offset,
        length,
        uploadHandle,
        chunkData,
      });
      if (chunkIdx === lastChunkIdx) {
        fileId = chunkResponse.h;
      }
    }
    if (!fileId) {
      throw new Error('upload failed');
    }
    const result = await this.anpApi.updateFileMetadata({
      file_name: fileName,
      file_extension: extension,
      file_role: role,
      file_handle: fileId,
    });
    return result;
  }

  // Fetch input files from ANP - not the ones stored in the db
  async getPlanInputFiles(id: number) {
    const row = await network_plan.findByPk(id);
    if (row == null) {
      throw new Error(`Plan not found: ${id}`);
    }
    const {fbid} = row.toJSON();
    if (fbid == null) {
      throw new Error('Plan has not been launched yet');
    }
    const inputs = await this.anpApi.getPlanInputFiles(fbid);
    return inputs;
  }

  // Fetch output files from ANP
  async getPlanOutputFiles(id: number) {
    const fbid = await this.getPlanFBID(id);
    const outputs = await this.anpApi.getPlanOutputFiles(fbid);
    return outputs;
  }

  async getPlanErrors(id: number): Promise<{error_message: string}> {
    const fbid = await this.getPlanFBID(id);
    const errors = await this.anpApi.getPlanErrors(fbid);
    return errors;
  }

  async getPlanFBID(id: number): Promise<string> {
    const row = await network_plan.findByPk(id);
    if (row == null) {
      throw new Error(`Plan not found: ${id}`);
    }
    const {fbid} = row.toJSON();
    if (fbid == null) {
      throw new Error('Plan has not been launched yet');
    }
    return fbid;
  }

  async getInputFilesByRole({role}: {role: string}): Promise<Array<InputFile>> {
    const rows = await network_plan_file.findAll({
      where: {
        role: role,
      },
    });
    const inputFiles = rows.map(r => inputFileRowToInputFile(r.toJSON()));
    return inputFiles;
  }

  async downloadFileStream(id: number) {
    const row = await network_plan_file.findByPk(id);
    if (row == null) {
      throw new Error(`File not found: ${id}`);
    }
    const {fbid} = row.toJSON();
    if (fbid == null) {
      throw new Error('File has not been uploaded');
    }
    return this.anpApi.downloadFile({id: fbid});
  }

  async setPlanState(id: number, state: NetworkPlanStateType): Promise<void> {
    const plan = await network_plan.findByPk(id);
    if (plan == null) {
      throw new Error(`Plan not found: ${id}`);
    }
    plan.state = state;
    await plan.save();
  }

  /**
   * Query the ANP API for the plan's current state and update in the db
   */
  async syncANPPlan(id: number): Promise<NetworkPlanAttributes> {
    const planRow = await network_plan.findByPk(id, {
      include: includeInputFiles(),
    });
    if (planRow == null) {
      throw new Error('Plan not found');
    }
    if (planRow.fbid == null) {
      throw new Error('Plan not launched');
    }
    const updated = await this.anpApi.getPlan(planRow.fbid);
    planRow.state = anpStatusToState(updated.plan_status);
    await planRow.save();
    return planRow.toJSON();
  }

  async getPlansInFolder({
    folderId,
  }: {
    folderId: number,
  }): Promise<Array<NetworkPlan>> {
    const rows = await network_plan.findAll({
      where: {folder_id: folderId},
      order: [['id', 'DESC']],
      include: includeInputFiles(),
    });

    const plans = [];
    for (const row of rows) {
      let plan = row.toJSON();
      // Poll the ANP api for any running plan state changes
      if (isRunning(plan.state)) {
        if (plan.fbid != null) {
          const syncedPlan = await this.syncANPPlan(plan.id);
          plan = syncedPlan;
        } else {
          // transition the plan into error state, something is wrong
          row.state = NETWORK_PLAN_STATE.ERROR;
          await row.save();
          plan = row.toJSON();
        }
      }
      plans.push(planRowToNetworkPlan(plan));
    }
    return plans;
  }

  async getNetworkPlan({id}: {id: number}) {
    const row = await network_plan.findByPk(id, {
      include: includeInputFiles(),
    });
    if (row == null) {
      return null;
    }
    let plan = row.toJSON();
    // fetch the plan state from ANP if the plan is running
    if (isRunning(plan.state)) {
      const syncedPlan = await this.syncANPPlan(plan.id);
      plan = syncedPlan;
    }
    return planRowToNetworkPlan(plan);
  }

  async getNetworkPlanMetrics({id}: {id: number}) {
    const planRow = await network_plan.findByPk(id);
    if (planRow == null) {
      throw new Error('Plan not found');
    }
    if (planRow.fbid == null) {
      throw new Error('Plan not launched');
    }
    if (planRow.state != NETWORK_PLAN_STATE.SUCCESS) {
      throw new Error('Plan not completed');
    }
    const metrics = await this.anpApi.getPlanMetrics(planRow.fbid);
    return metrics;
  }

  async createInputFile(req: InputFile): Promise<InputFile> {
    const inputFile: $Shape<NetworkPlanFileAttributes> = {
      source: req.source,
      /**
       * by default, all new files are in the pending state.
       * If the file is external, its state will be changed to ready
       * in _setInputFileMetadata
       */
      state: FILE_STATE.pending,
    };
    await this._setInputFileMetadata(inputFile, req);

    const createdFile = await network_plan_file.create(inputFile);
    return inputFileRowToInputFile(createdFile);
  }

  async updateInputFile(req: InputFile): Promise<InputFile> {
    const {id} = req;
    const fileRow = await network_plan_file.findByPk(id);
    if (fileRow == null) {
      throw new Error('');
    }
    await this._setInputFileMetadata(fileRow, req);
    //TODO: if switching from a draft file, delete the file on disk
    await fileRow.save();
    return inputFileRowToInputFile(fileRow.toJSON());
  }

  async _setInputFileMetadata(
    file: NetworkPlanFileAttributes,
    request: InputFile,
  ) {
    if (request.source === FILE_SOURCE.fbid) {
      if (request.fbid == null || request.fbid.trim() == '') {
        throw new Error('fbid is required');
      }
      const fileMetadata = await this.anpApi.getFileMetadata({
        id: request.fbid,
      });
      Object.assign(
        file,
        ({
          name: fileMetadata.file_name,
          role: fileMetadata.file_role,
          fbid: fileMetadata.id,
          state: FILE_STATE.ready,
        }: $Shape<NetworkPlanFileAttributes>),
      );
    } else if (request.source === FILE_SOURCE.local) {
      /**
       * The user has permission to upload a local file after
       * this row is created
       */
      Object.assign(file, {
        name: request.name,
        role: request.role,
      });
    }
  }

  async getInputFile({id}: {id: number}) {
    const file = await network_plan_file.findByPk(id);
    if (file == null) {
      return null;
    }
    return inputFileRowToInputFile(file);
  }

  // once the file is fully uploaded, replace the old one with the new one
  async handleDraftFileUploaded({
    id,
    fileData,
  }: {
    id: number,
    fileData: {
      originalname: string,
      size: number,
      destination: string,
      path: string,
    },
  }) {
    const currentPath = fileData.path;
    if (!(await checkPathExists(currentPath))) {
      throw new Error(`File does not exist at path: ${currentPath}`);
    }
    const fileRow = await network_plan_file.findByPk(id);
    if (fileRow == null) {
      throw new Error(
        `File uploaded but could not be found in db: ${id} - ${fileData.path}`,
      );
    }
    const fileMetadata = fileRow.toJSON();
    // Make the directory for input files if it does not exist
    await makeANPDir('inputs');
    const newPath = getInputFilePath({
      file: fileMetadata,
    });
    try {
      /**
       * Write the file to the plan directory. This is done by renaming from
       * the old tmp/ filepath to the plan directory filepath.
       * This will overwrite the existing file.
       */
      await new Promise((res, rej) => {
        mv(currentPath, newPath, err => {
          if (err) {
            return rej(err);
          }
          return res();
        });
      });
      fileRow.state = FILE_STATE.ready;
      await fileRow.save();
    } catch (err) {
      console.error(err);
      throw new Error('File upload failed');
    }
  }

  async deleteInputFile({id}: {id: number}) {
    const fileRow = await network_plan_file.findByPk(id);
    if (fileRow == null) {
      throw new Error('File does not exist');
    }
    const fileMetadata = fileRow.toJSON();

    let conditional;
    if (fileMetadata.role === FILE_ROLE.DSM_GEOTIFF) {
      conditional = {where: {dsm_file_id: fileMetadata.id}};
    } else if (fileMetadata.role === FILE_ROLE.BOUNDARY_FILE) {
      conditional = {where: {boundary_file_id: fileMetadata.id}};
    } else {
      conditional = {where: {sites_file_id: fileMetadata.id}};
    }

    // Ensure that no other plans are using this file
    const plans = await network_plan.findAll(conditional);
    if (plans.length != 0) {
      return;
    }

    // first, delete the file from the DB
    await fileRow.destroy();
    // next, delete the file from the filesystem if it's a local file
    if (fileMetadata.source === FILE_SOURCE.local) {
      const filePath = getInputFilePath({
        file: fileMetadata,
      });
      await new Promise((res, rej) => {
        fs.unlink(filePath, err => {
          if (err) {
            return rej();
          }
          return res();
        });
      });
    }
  }

  /**
   * This is called by multer before a file is uploaded, return false or
   * throw an error to prevent the file being uploaded.
   */
  async verifyFileUpload({id}: {id: string}) {
    const result = await network_plan_file.findByPk(id);
    if (result == null) {
      throw new Error('file not found');
    }
    const file = result.toJSON();
    return file.source === FILE_SOURCE.local;
  }

  async _tryUploadHardwareProfiles({
    profiles,
  }: {
    profiles: Array<string>,
  }): Promise<ANPFileHandle> {
    const usedProfiles = profiles.reduce<Array<HardwareProfile>>(
      (list, hwBoardId) => {
        const profile = this.hardwareProfiles[hwBoardId];
        if (profile == null) {
          throw new Error(
            `Hardware Profile: ${hwBoardId} is not available in ` +
              `hardware profiles: ${Object.keys(this.hardwareProfiles).join(
                ',',
              )}`,
          );
        }
        list.push(profile);
        return list;
      },
      [],
    );
    const meshPlannerDeviceParams = usedProfiles.reduce<
      Array<MeshPlannerDeviceParams>,
    >((list, profile) => {
      return list.concat(hardwareProfileToDeviceParams(profile));
    }, []);
    const jsonData = JSON.stringify(meshPlannerDeviceParams);
    const fileHandle = await this.uploadANPString({
      name: 'hardware_profiles.json',
      data: jsonData,
      role: FILE_ROLE.URBAN_DEVICE_LIST_JSON,
    });
    await this.waitForFileReadyState(fileHandle);
    return fileHandle;
  }

  _initHardwareProfiles() {
    loadProfiles()
      .then(profileList => {
        this.hardwareProfiles = (profileList ?? []).reduce<HardwareProfiles>(
          (map, profile) => {
            map[profile.hwBoardId] = profile;
            return map;
          },
          {},
        );
      })
      .catch(err => {
        console.error(err.message);
        this.hardwareProfiles = {};
      });
  }

  async waitForFileReadyState(anpFile: ANPFileHandle) {
    try {
      await pollConditionally({
        fn: async () => await this.anpApi.getInputFile(anpFile.id),
        fnCondition: (result: ANPFileHandle) =>
          result.file_status == INPUT_FILE_STATE.READY,
        ms: 1000,
        numCallsTimeout: 60 * 15, // ~ 15 min
      });
    } catch {
      throw new Error('Timeout while waiting for files to be ready.');
    }
  }
}

/**
 * Gets the ids of all a plan's input files by looking up each
 * foreign key on the plan
 * For example,
 * sites_file_id:1,
 * dsm_file_id:2,
 * boundary_file_id:null,
 * ...
 *
 * inputFileIds would contain [1,2]
 *
 */

function getPlanInputFileIds(plan: NetworkPlanAttributes): Array<number> {
  const inputFileIds: Array<number> = [];
  for (const f of getInputFileFields()) {
    const val = plan[f.foreignKey];
    if (typeof val === 'number') {
      inputFileIds.push(val);
    }
  }
  return inputFileIds;
}
// sequelize eager-loading helpers
function includeFolder(): Array<IncludeOptions<any, any>> {
  return [{model: network_plan_folder, as: 'folder'}];
}

function includeInputFiles(): Array<IncludeOptions<any, any>> {
  return getInputFileFields().map(field => ({
    model: network_plan_file,
    as: field.as,
  }));
}

export function isRunning(state: string): boolean {
  return RUNNING_NETWORK_PLAN_STATES.has(state);
}

export function isLaunching(state: string): boolean {
  return LAUNCHING_NETWORK_PLAN_STATES.has(state);
}

// Convert from ANPPlan plan_status to NetworkPlan state
export function anpStatusToState(
  status: $Keys<typeof PLAN_STATUS>,
): $Keys<typeof NETWORK_PLAN_STATE> {
  const mapping = {
    [PLAN_STATUS.IN_PREPARATION]: NETWORK_PLAN_STATE.RUNNING,
    [PLAN_STATUS.SUCCEEDED]: NETWORK_PLAN_STATE.SUCCESS,
    [PLAN_STATUS.RUNNING]: NETWORK_PLAN_STATE.RUNNING,
    [PLAN_STATUS.SCHEDULED]: NETWORK_PLAN_STATE.RUNNING,
    [PLAN_STATUS.FAILED]: NETWORK_PLAN_STATE.ERROR,
    [PLAN_STATUS.KILLED]: NETWORK_PLAN_STATE.CANCELLED,
  };
  return mapping[status];
}

// One hardware profile can map to multiple MeshPlannerDeviceParams objects
function hardwareProfileToDeviceParams(
  profile: HardwareProfile,
): Array<MeshPlannerDeviceParams> {
  const params: Array<MeshPlannerDeviceParams> = [];
  const baseParams: MeshPlannerDeviceParams = {
    device_sku: profile.hwBoardId,
    node_capex: profile.financial.node_capex,
    device_type: NodeTypeValueMap.DN,
    number_of_boxes_per_site: profile.topology.max_nodes_per_site,
    sector_params: {
      num_sectors_per_box: profile.topology.num_sectors_per_box,
      min_mcs: profile.sector_params.min_mcs,
      scan_range_az_deg: profile.sector_params.scan_range_az_deg,
      antenna_boresight_gain_dbi:
        profile.sector_params.antenna_boresight_gain_dbi,
      max_tx_power_dbm: profile.sector_params.max_tx_power_dbm,
      min_tx_power_dbm: profile.sector_params.min_tx_power_dbm,
      min_mcs: profile.sector_params.min_mcs,
      tx_diversity_gain_db: profile.sector_params.tx_diversity_gain_db,
      rx_diversity_gain_db: profile.sector_params.rx_diversity_gain_db,
      tx_misc_loss_db: profile.sector_params.tx_misc_loss_db,
      rx_misc_loss_db: profile.sector_params.rx_misc_loss_db,
    },
  };
  // mesh-planner supports one profile per device-type
  for (const hwType of profile.topology.device_types) {
    params.push({
      ...baseParams,
      device_type: NodeTypeValueMap[hwType],
    });
  }
  return params;
}
