/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import axios from 'axios';
import {DEFAULT_FILE_UPLOAD_CHUNK_SIZE} from '@fbcnms/tg-nms/shared/dto/FacebookGraph';
import type {
  ANPFileHandle,
  ANPFileHandleRequest,
  ANPPlanMetrics,
  FileRoles,
  GraphQueryResponse,
} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {
  CreateNetworkPlanRequest,
  InputFile,
  LaunchPlanResult,
  NetworkPlan,
  PlanError,
  PlanFolder,
  SitesFile,
  UpdateNetworkPlanRequest,
} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import type {
  FileUploadChunkResponse,
  FileUploadSessionRequest,
  FileUploadSessionResponse,
} from '@fbcnms/tg-nms/shared/dto/FacebookGraph';

export async function createInputFile(
  req: $Shape<InputFile>,
): Promise<InputFile> {
  const response = await axios.post<InputFile, InputFile>(
    `/network_plan/file`,
    req,
  );
  return response.data;
}
export async function updateInputFile(req: InputFile): Promise<InputFile> {
  const response = await axios.put<InputFile, InputFile>(
    `/network_plan/file/${req.id}`,
    req,
  );
  return response.data;
}
export async function deleteInputFile(req: {id: number}): Promise<void> {
  await axios.delete<void, void>(`/network_plan/file/${req.id}`, req);
}

export async function uploadInputFileData({
  file,
  fileId,
  onProgress,
}: {
  file: File,
  fileId: number,
  onProgress?: (pct: number) => *,
}): Promise<InputFile> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(`/network_plan/file/${fileId}`, formData, {
    onUploadProgress: progressEvent => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total,
      );
      if (typeof onProgress === 'function') {
        onProgress(percentCompleted);
      }
    },
  });
  return response.data;
}

/**
 * ANP API
 *
 * These methods are proxied directly to the ANP API
 */
export async function uploadANPFile({
  role,
  file,
  onProgress,
  uploadChunkSize,
}: {
  name: string,
  role: FileRoles,
  file: File,
  // used for testing
  uploadChunkSize?: number,
  onProgress?: (pct: number) => *,
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
  };
  const fileName = file.name.slice(0, file.name.indexOf('.'));
  const extension = file.name.slice(file.name.lastIndexOf('.') + 1);
  const mimeType = fileTypeMapping[extension];
  if (!mimeType) {
    throw new Error(
      `Error: ${file.name}. Could determine mime-type from extension: ${extension}`,
    );
  }

  const response = await axios<
    FileUploadSessionRequest,
    FileUploadSessionResponse,
  >({
    method: 'POST',
    url: '/network_plan/file/uploads',
    data: {
      file_length: file.size,
      // must be a standard mime type
      file_type: mimeType,
      file_name: fileName,
    },
  });
  // file upload session id - all chunks must reference this
  const {id: uploadHandle} = response.data;
  const numChunks = Math.floor(file.size / chunkSize) + 1;
  const lastChunkIdx = numChunks - 1;
  // const perfStart = performance.now();
  let fileId = null;
  for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
    const offset = chunkIdx * chunkSize;
    let length = chunkSize;
    if (offset + length > file.size) {
      length = file.size - offset;
    }
    const fileData = file.slice(offset, offset + length);
    const chunkResponse = await axios<Blob, FileUploadChunkResponse>({
      // uploadHandle already contains the ? for the querystring
      url: `/network_plan/file/upload/${uploadHandle}&chunkSize=${length}`,
      method: 'POST',
      data: fileData,
      headers: {
        'Content-Type': 'multipart/form-data',
        file_offset: offset.toString(),
      },
    });
    if (typeof onProgress === 'function') {
      // avoid divide by zero if there's only one chunk
      const ratio = numChunks > 1 ? chunkIdx / lastChunkIdx : 1;
      onProgress(ratio * 100);
    }
    if (chunkIdx === lastChunkIdx) {
      fileId = chunkResponse.data.h;
    }
  }

  if (!fileId) {
    throw new Error('upload failed');
  }
  // associate the file with ANP partner and assign its role
  const result = await axios<ANPFileHandleRequest, ANPFileHandle>({
    url: `/network_plan/file`,
    method: 'PUT',
    data: {
      file_name: fileName,
      file_extension: extension,
      file_role: role,
      file_handle: fileId,
    },
  });
  return result.data;
}

export async function createPlan(req: $Shape<CreateNetworkPlanRequest>) {
  const response = await axios<CreateNetworkPlanRequest, NetworkPlan>({
    url: `/network_plan/plan`,
    method: 'POST',
    data: req,
  });
  return response.data;
}

export async function updatePlan(
  req: UpdateNetworkPlanRequest,
): Promise<NetworkPlan> {
  const response = await axios.put<UpdateNetworkPlanRequest, NetworkPlan>(
    `/network_plan/plan/${req.id}`,
    req,
  );
  return response.data;
}

export async function launchPlan(req: {id: number}) {
  const response = await axios<void, LaunchPlanResult>({
    url: `/network_plan/plan/${req.id}/launch`,
    method: 'POST',
  });
  return response.data;
}

export async function deletePlan({id}: {id: number}): Promise<void> {
  await axios.delete(`/network_plan/plan/${id}`);
}

export async function cancelPlan(req: {id: number}) {
  const response = await axios<void, {success: boolean}>({
    url: `/network_plan/plan/${req.id}/cancel`,
    method: 'POST',
  });
  return response.data;
}

/**
 * Gets input files from the NMS DB. These don't have to be
 * associated with any plan.
 */
export async function getInputFiles({
  role,
}: {
  role: FileRoles,
}): Promise<Array<InputFile>> {
  const response = await axios.get<void, Array<InputFile>>(
    `/network_plan/inputs?role=${role}`,
  );
  return response.data;
}

// DEPRECATED
export async function getPartnerFiles({role}: {role: FileRoles}) {
  const response = await axios<
    {role: FileRoles},
    GraphQueryResponse<ANPFileHandle>,
  >({
    url: `/network_plan/file?role=${role}`,
    method: 'GET',
  });
  return response.data;
}

export async function getFolders(): Promise<Array<PlanFolder>> {
  const response = await axios<void, Array<PlanFolder>>({
    url: `/network_plan/folder`,
    method: 'GET',
  });
  return response.data;
}

export async function getFolder({
  folderId,
}: {
  folderId: string,
}): Promise<PlanFolder> {
  const response = await axios<void, PlanFolder>({
    url: `/network_plan/folder/${folderId}`,
    method: 'GET',
  });
  return response.data;
}

export async function deleteFolder({
  folderId,
}: {
  folderId: string,
}): Promise<void> {
  await axios.delete(`/network_plan/folder/${folderId}`);
}

export async function createFolder(
  folder: $Shape<PlanFolder>,
): Promise<PlanFolder> {
  const response = await axios<$Shape<PlanFolder>, PlanFolder>({
    url: `/network_plan/folder`,
    method: 'POST',
    data: folder,
  });
  return response.data;
}

export async function updateFolder({
  id,
  name,
}: $Shape<PlanFolder>): Promise<PlanFolder> {
  const response = await axios<$Shape<PlanFolder>, PlanFolder>({
    url: `/network_plan/folder/${id}`,
    method: 'PUT',
    data: {name},
  });
  return response.data;
}

export async function getPlansInFolder({
  folderId,
}: {
  folderId: string,
}): Promise<Array<NetworkPlan>> {
  const response = await axios<void, Array<NetworkPlan>>({
    url: `/network_plan/plan?folderId=${folderId}`,
    method: 'GET',
  });
  return response.data;
}

export async function getPlan({id}: {id: string}): Promise<NetworkPlan> {
  const response = await axios<void, NetworkPlan>({
    url: `/network_plan/plan/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function getPlanMetrics({
  id,
}: {
  id: string,
}): Promise<$PropertyType<ANPPlanMetrics, 'metrics'>> {
  const response = await axios<void, ANPPlanMetrics>({
    url: `/network_plan/plan/${id}/metrics`,
    method: 'GET',
  });
  return response.data.metrics;
}

export async function getPlanInputFiles({
  id,
}: {
  id: string,
}): Promise<Array<ANPFileHandle>> {
  const response = await axios<void, Array<ANPFileHandle>>({
    url: `/network_plan/plan/${id}/inputs`,
    method: 'GET',
  });
  return response.data;
}

export async function getPlanOutputFiles({
  id,
}: {
  id: string,
}): Promise<Array<ANPFileHandle>> {
  const response = await axios<void, Array<ANPFileHandle>>({
    url: `/network_plan/plan/${id}/outputs`,
    method: 'GET',
  });
  return response.data;
}

export async function getPlanErrors({
  id,
}: {
  id: number,
}): Promise<Array<PlanError>> {
  const response = await axios<void, Array<PlanError>>({
    url: `/network_plan/plan/${id}/errors`,
    method: 'GET',
  });
  return response.data;
}

export async function downloadFile<T>({id}: {id: string}): Promise<T> {
  const response = await axios<void, T>({
    url: `/network_plan/file/${id}/download`,
    method: 'GET',
  });
  return response.data;
}

// lazy hack
export async function downloadANPFile<T>({id}: {id: string}): Promise<T> {
  const response = await axios<void, T>({
    url: `/network_plan/file/${id}/anp-download`,
    method: 'GET',
  });
  return response.data;
}

type CreateSitesFileRequest = {|
  name: string,
|};
export async function createSitesFile(data: CreateSitesFileRequest) {
  const response = await axios<CreateSitesFileRequest, InputFile>({
    url: `/network_plan/sites`,
    method: 'POST',
    data: data,
  });
  return response.data;
}
export async function updateSitesFile(data: SitesFile) {
  const response = await axios<SitesFile, SitesFile>({
    url: `/network_plan/sites/${data.id}`,
    method: 'PUT',
    data: data,
  });
  return response.data;
}

export async function getSitesFile({id}: {id: number}): Promise<SitesFile> {
  const response = await axios<void, SitesFile>({
    url: `/network_plan/sites/${id}`,
    method: 'GET',
  });
  return response.data;
}
