/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow strict-local
 * @format
 */

import * as fs from 'fs';
import axios from 'axios';
import {DEFAULT_FILE_UPLOAD_CHUNK_SIZE} from '@fbcnms/tg-nms/shared/dto/FacebookGraph';
import {Readable} from 'stream';
import {isPlainObject, pick} from 'lodash';
import {stringify} from 'querystring';
import {trimEnd} from 'lodash';
import type {$AxiosXHR} from 'axios';
import type {
  ANPCommandResponse,
  ANPFileHandle,
  ANPFolder,
  ANPPlan,
  ANPPlanMetrics,
  CreateANPPlanRequest,
  GraphQueryResponse,
} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {
  FileUploadSessionRequest,
  FileUploadSessionResponse,
} from '@fbcnms/tg-nms/shared/dto/FacebookGraph';

export type ANPAPIClientConfig = {|
  anpBaseURL: string,
  oAuthBaseURL: string,
  partnerId: string,
  oAuthCredentials: $Shape<OAuthClientCredentials>,
|};

export type OAuthClientCredentials = {|
  client_id: string,
  client_secret: string,
|};

export type FacebookOAuthTokenResponse = {|
  access_token: string,
  token_type: string,
|};

type QueryMap = {|[string]: string | number|};
type Headers = {|[string]: string|};
type APIRequest<TBody> = {
  baseURL: string,
  path: string,
  query?: QueryMap,
  method: string,
  data?: TBody,
  headers?: Headers,
  // only used when downloading files
  responseType?:
    | 'arraybuffer'
    | 'blob'
    | 'document'
    | 'json'
    | 'text'
    | 'stream',
};

export default class ANPAPIClient {
  config: ANPAPIClientConfig;
  accessToken: ?string;
  constructor(config: $Shape<ANPAPIClientConfig>) {
    if (!this._validateConfig(config)) {
      throw new Error(`Invalid config: ${JSON.stringify(config, null, 2)}`);
    }
    this.config = config;
  }

  getFolders = async () => {
    const result = await this.makeRequest<GraphQueryResponse<ANPFolder>>({
      id: this.config.partnerId,
      edge: 'folders',
      query: {fields: 'id,folder_name'},
      method: 'GET',
    });
    /**
     * makeRequest returns axios's response.data property.
     * the response contains an additional data property
     */
    return result.data;
  };

  getFolderById = async ({id}: {id: string}): Promise<?ANPFolder> => {
    const result = await this.makeRequest<ANPFolder>({
      id: id,
      query: {fields: 'id,folder_name'},
      method: 'GET',
    });
    return result;
  };

  getPlansInFolder = async ({folder_id}: {folder_id: string}) => {
    const result = await this.makeRequest<GraphQueryResponse<ANPPlan>>({
      id: folder_id,
      edge: 'plans',
      query: {fields: 'id,plan_name,plan_status,expected_completion_time'},
      method: 'GET',
    });
    /**
     * makeRequest returns axios's response.data property.
     * the response contains an additional data property
     */
    return result.data;
  };

  getPlan = async (id: string) => {
    const result = await this.makeRequest<ANPPlan>({
      id,
      query: {fields: 'plan_name,plan_status,expected_completion_time'},
      method: 'GET',
    });
    return result;
  };
  getPlanInputFiles = async (id: string) => {
    const result = await this.makeRequest<GraphQueryResponse<ANPFileHandle>>({
      id,
      edge: 'inputs',
      query: {fields: 'file_name,file_extension,file_role,file_is_pending'},
      method: 'GET',
    });
    return result.data;
  };

  /**
   * Get the metadata information for a specific file.
   * `id` is the input file id.
   */
  getInputFile = async (id: string) => {
    const result = await this.makeRequest<ANPFileHandle>({
      id,
      query: {
        fields: 'file_name,file_extension,file_role,file_status',
      },
      method: 'GET',
    });
    return result;
  };
  getPlanOutputFiles = async (id: string) => {
    const result = await this.makeRequest<GraphQueryResponse<ANPFileHandle>>({
      id,
      edge: 'outputs',
      query: {fields: 'file_name,file_extension,file_role,file_is_pending'},
      method: 'GET',
    });
    return result.data;
  };
  getPlanErrors = async (id: string) => {
    const result = await this.makeRequest<
      GraphQueryResponse<{error_message: string}>,
    >({
      id,
      edge: 'errors',
      query: {fields: 'error_message'},
      method: 'GET',
    });
    return result.data;
  };
  getPlanMetrics = async (id: string) => {
    const result = this.makeRequest<ANPPlanMetrics>({
      id,
      query: {fields: 'metrics'},
      method: 'GET',
    });
    return result;
  };
  downloadFile = async ({
    id,
  }: {
    id: string,
  }): Promise<$AxiosXHR<void, Readable>> => {
    const response = await this._request<void, Readable>({
      baseURL: 'https://lookaside.facebook.com',
      path: 'anp/graph_api/download/',
      query: {id: id},
      method: 'GET',
      responseType: 'stream',
    });
    return response;
  };
  createUploadSession = async (req: $Shape<FileUploadSessionRequest>) => {
    return this.graphRequest<
      FileUploadSessionRequest,
      FileUploadSessionResponse,
    >({
      endpoint: 'app/uploads',
      query: {
        ...req,
      },
      method: 'POST',
    });
  };
  uploadChunk = async ({
    uploadHandle,
    chunkData,
    offset,
    length,
  }: {
    uploadHandle: string,
    chunkData: Buffer,
    length: number,
    offset: number,
  }) => {
    // Chunk size is user input. Validate it against the max
    if (length > DEFAULT_FILE_UPLOAD_CHUNK_SIZE) {
      throw new Error(
        `Request body length( ${length} exceeded Maximum chunk size (${DEFAULT_FILE_UPLOAD_CHUNK_SIZE})`,
      );
    }
    const result = await this.graphRequest({
      endpoint: uploadHandle,
      data: chunkData,
      method: 'POST',
      headers: {
        file_offset: offset.toString(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return result;
  };

  createFolder = ({folder_name}: $Shape<ANPFolder>) => {
    return this.makeRequest<{id: string}>({
      id: this.config.partnerId,
      edge: 'folders',
      method: 'POST',
      query: {
        folder_name,
        folder_description: 'from tgnms',
      },
    });
  };

  createPlan({
    folder_id,
    plan_name,
    boundary_polygon,
    dsm,
    site_list,
    device_list_file,
  }: CreateANPPlanRequest): Promise<ANPPlan> {
    const query: {[string]: string | number} = {
      plan_name,
      boundary_polygon,
      digital_surface_model: dsm,
      site_list,
    };
    if (
      typeof device_list_file === 'string' &&
      device_list_file.trim() !== ''
    ) {
      query.device_list_file = device_list_file;
    }
    return this.makeRequest<ANPPlan>({
      id: folder_id,
      edge: 'terragraph_basic_plan',
      method: 'POST',
      query: query,
    });
  }

  launchPlan({id}: {id: string}) {
    return this.makeRequest<ANPCommandResponse>({
      id,
      edge: 'launch',
      method: 'POST',
    });
  }
  cancelPlan({id}: {id: string}) {
    return this.makeRequest<ANPCommandResponse>({
      id,
      edge: 'cancel',
      method: 'POST',
    });
  }

  getPartnerFilesByRole = ({
    role,
  }: {
    role: string,
  }): Promise<GraphQueryResponse<ANPFileHandle>> => {
    if (!role) {
      throw new Error('role field is required');
    }
    return this.makeRequest<GraphQueryResponse<ANPFileHandle>>({
      id: this.config.partnerId,
      edge: 'files',
      query: {
        file_role: role,
        fields: 'file_name,file_extension,file_role,file_status',
      },
      method: 'GET',
    });
  };
  getFileMetadata = async ({id}: {id: string}): Promise<ANPFileHandle> => {
    return this.makeRequest<ANPFileHandle>({
      id: id,
      query: {
        fields: 'file_name,file_extension,file_role,file_status',
      },
      method: 'GET',
    });
  };
  updateFileMetadata = async ({
    file_name,
    file_extension,
    file_role,
    file_handle,
  }: $Shape<{
    file_handle: string,
    ...ANPFileHandle,
  }>) => {
    if (!(file_name && file_extension && file_role && file_handle)) {
      return Promise.reject(
        new Error(
          'Required fields: file_name,file_extension,file_role,file_handle',
        ),
      );
    }
    const response = await this.makeRequest<ANPFileHandle>({
      id: this.config.partnerId,
      edge: 'files',
      method: 'POST',
      query: {
        file_name,
        file_extension,
        file_role,
        file_handle,
        fields: 'file_name,file_extension,file_role,file_status',
      },
    });
    return response;
  };

  // TODO retry failed requests after refreshing access token
  async makeRequest<TRes>({
    id,
    edge,
    query,
    method,
  }: {
    id: string,
    edge?: string,
    query?: QueryMap,
    method: string,
  }): Promise<TRes> {
    if (!this._isAccessTokenValid()) {
      await this._refreshAccessToken();
    }
    const {anpBaseURL} = this.config;
    let path = id;
    if (typeof edge === 'string' && edge !== '') {
      path += `/${edge}`;
    }
    try {
      const response = await this._request({
        baseURL: anpBaseURL,
        path,
        query,
        method,
      });
      return response.data;
    } catch (err) {
      // if it's not an http error, bubble it up
      if (!err.response) {
        throw err;
      }
      if (err.response && err.response.status === 403) {
        /**
         * This is a debug field returned by facebook apis
         */
        const debugHeader = err.response.headers['www-authenticate'];
        if (typeof debugHeader === 'string' && debugHeader !== '') {
          err.message = debugHeader;
          throw err;
        }
      }
      throw err;
    }
  }

  async graphRequest<TReq, TRes>({
    endpoint,
    query,
    method,
    data,
    headers,
  }: {|
    endpoint: string,
    query?: QueryMap,
    method: string,
    data?: TReq,
    headers?: Headers,
  |}): Promise<TRes> {
    const response = await this._request<TReq, TRes>({
      baseURL: 'https://graph.facebook.com',
      path: endpoint,
      query,
      data,
      headers,
      method,
    });
    return response.data;
  }

  async _request<TReq, TRes>({
    baseURL,
    path,
    query,
    headers,
    method,
    data,
    responseType,
  }: APIRequest<TReq>): Promise<$AxiosXHR<TReq | void, TRes>> {
    if (!this._isAccessTokenValid()) {
      await this._refreshAccessToken();
    }
    const qs = stringify({
      ...(query || {}),
    });

    let url = `${trimEnd(baseURL, '/')}/${path}`;
    if (qs.length > 0) {
      url += `?${qs}`;
    }

    const config = {
      url,
      headers: {
        ...(headers || {}),
        ...this._makeAuthHeader(),
      },
      method: method,
      data: data,
      responseType: responseType ?? 'json',
    };

    try {
      const response = await axios<TReq | void, TRes>(config);
      logAxios(response);
      return response;
    } catch (err) {
      if (err.response) {
        logAxios(err.response);
      } else {
        console.error(err);
      }
      throw err;
    }
  }

  _isAccessTokenValid = () => {
    if (
      typeof this.accessToken === 'string' &&
      this.accessToken.trim() !== ''
    ) {
      return true;
    }

    return false;
  };

  _refreshAccessToken = async () => {
    const {client_id, client_secret} = this.config.oAuthCredentials;
    const query = stringify({
      client_id,
      client_secret,
      grant_type: 'client_credentials',
    });
    const response = await axios<void, FacebookOAuthTokenResponse>({
      method: 'GET',
      url: `https://graph.facebook.com/oauth/access_token?${query}`,
    });
    if (response.data.access_token) {
      this.accessToken = response.data.access_token;
    } else {
      console.error(`Refreshing access token failed: ${response.statusText}`);
    }
  };

  _makeAuthHeader = (): {|Authorization: string|} => {
    if (this.accessToken == null) {
      throw new Error('Missing access token');
    }
    return {
      Authorization: `OAuth ${this.accessToken}`,
    };
  };
  _validateConfig = (config: $Shape<ANPAPIClientConfig>): boolean => {
    const {anpBaseURL, oAuthBaseURL, partnerId, oAuthCredentials} = config;
    if (
      anpBaseURL &&
      oAuthBaseURL &&
      partnerId &&
      oAuthCredentials &&
      oAuthCredentials?.client_id &&
      oAuthCredentials?.client_secret
    ) {
      return true;
    }
    return false;
  };
}

function logAxios<T, R>(xhr: $AxiosXHR<T, R>) {
  const logfile = process.env.PLANNER_REQUEST_LOGFILE;
  if (typeof logfile === 'string') {
    try {
      const {data, headers, status, statusText, config} = xhr;
      const log = {
        request: pick(config, ['headers', 'method', 'url']),
        response: {
          data: isPlainObject(data) ? data : '[Omitted]',
          headers,
          status,
          statusText,
        },
      };
      fs.appendFileSync(logfile, JSON.stringify(log, null, 2) + '\n');
    } catch (err) {
      console.error(xhr);
      console.error(err);
    }
  }
}
