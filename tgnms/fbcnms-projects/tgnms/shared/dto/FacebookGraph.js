/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

export const DEFAULT_FILE_UPLOAD_CHUNK_SIZE = 1000000;

export type FileUploadSessionRequest = {|
  file_length: number,
  // must be a standard mime type
  file_type: string,
  file_name: string,
|};

export type FileUploadSessionResponse = {|
  id: string,
|};

// the h param is only set on the response to the last chunk upload
export type FileUploadChunkResponse = {|
  h?: string,
|};
