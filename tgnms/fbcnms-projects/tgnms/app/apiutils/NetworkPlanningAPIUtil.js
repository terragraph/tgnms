/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import axios from 'axios';

import {FILE_UPLOAD_CHUNK_SIZE} from '@fbcnms/tg-nms/shared/dto/FacebookGraph';
import type {
  ANPFolder,
  ANPPlan,
  ANPPlanError,
  AnpFileHandle,
  AnpFileHandleRequest,
  CreateANPPlanRequest,
  GraphQueryResponse,
  LaunchANPPlanResponse,
} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {
  FileUploadChunkResponse,
  FileUploadSessionRequest,
  FileUploadSessionResponse,
} from '@fbcnms/tg-nms/shared/dto/FacebookGraph';

export async function uploadFile({
  role,
  file,
  onProgress,
}: {
  name: string,
  role: string,
  file: File,
  onProgress?: (pct: number) => *,
}): Promise<AnpFileHandle> {
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
  const numChunks = Math.floor(file.size / FILE_UPLOAD_CHUNK_SIZE) + 1;
  const lastChunkIdx = numChunks - 1;
  // const perfStart = performance.now();
  let fileId = null;
  for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
    const offset = chunkIdx * FILE_UPLOAD_CHUNK_SIZE;
    let length = FILE_UPLOAD_CHUNK_SIZE;
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
  const result = await axios<AnpFileHandleRequest, AnpFileHandle>({
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

/**
 * we're sending the network name and not the folderid because of API
 * issues with querying folders
 */
export async function createPlan(req: $Shape<CreateANPPlanRequest>) {
  const response = await axios<CreateANPPlanRequest, ANPPlan>({
    url: `/network_plan/plan`,
    method: 'POST',
    data: req,
  });
  return response.data;
}

export async function launchPlan(req: {id: string}) {
  const response = await axios<void, LaunchANPPlanResponse>({
    url: `/network_plan/plan/launch/${req.id}`,
    method: 'POST',
  });
  return response.data;
}

export async function getPartnerFiles({role}: {role: string}) {
  const response = await axios<
    {role: string},
    GraphQueryResponse<AnpFileHandle>,
  >({
    url: `/network_plan/file?role=${role}`,
    method: 'GET',
  });
  return response.data;
}

export async function getFolders(): Promise<Array<ANPFolder>> {
  const response = await axios<void, Array<ANPFolder>>({
    url: `/network_plan/folder`,
    method: 'GET',
  });
  return response.data;
}

export async function getPlansInFolder({
  name,
}: {
  name: string,
}): Promise<Array<ANPPlan>> {
  const response = await axios<void, Array<ANPPlan>>({
    url: `/network_plan/plan?folderName=${name}`,
    method: 'GET',
  });
  return response.data;
}

export async function getPlan({id}: {id: string}): Promise<ANPPlan> {
  const response = await axios<void, ANPPlan>({
    url: `/network_plan/plan/${id}`,
    method: 'GET',
  });
  return response.data;
}

export async function getPlanInputFiles({
  id,
}: {
  id: string,
}): Promise<Array<AnpFileHandle>> {
  const response = await axios<void, Array<AnpFileHandle>>({
    url: `/network_plan/plan/${id}/inputs`,
    method: 'GET',
  });
  return response.data;
}
export async function getPlanOutputFiles({
  id,
}: {
  id: string,
}): Promise<Array<AnpFileHandle>> {
  const response = await axios<void, Array<AnpFileHandle>>({
    url: `/network_plan/plan/${id}/outputs`,
    method: 'GET',
  });
  return response.data;
}
export async function getPlanErrors({
  id,
}: {
  id: string,
}): Promise<Array<ANPPlanError>> {
  const response = await axios<void, Array<ANPPlanError>>({
    url: `/network_plan/plan/${id}/errors`,
    method: 'GET',
  });
  return response.data;
}
export async function downloadFile({id}: {id: string}): Promise<Blob> {
  const response = await axios<void, Blob>({
    url: `/network_plan/file/${id}`,
    method: 'GET',
  });
  return response.data;
}
