/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as apiUtil from '../NetworkPlanningAPIUtil';
import axiosMock from 'axios';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {AxiosXHRConfig} from 'axios';
jest.mock('axios');

afterEach(() => {
  // remove spies and mock calls
  jest.resetAllMocks();
});

// https://developers.facebook.com/docs/graph-api/resumable-upload-api/
const MOCK_UPLOAD_SESSION_RESPONSE = {
  id:
    'upload:' +
    'MTphdHRhY2htZW50Ojlk2mJiZxUwLWV6MDUtNDIwMy05yTA3LWQ4ZDPmZGFkNTM0NT8' +
    '=?sig=ARZqkGCA_uQMxC8nHKI',
};
const MOCK_FILE_HANDLE_RESPONSE = {
  h:
    '2:c2FtcGxlLm1wNA==:image/jpeg:GKAj0gAUCZmJ1voFADip2iIAAAAAbugbAAAA' +
    ':e:1472075513:ARZ_3ybzrQqEaluMUdI',
};

const MOCK_ANP_FILE = {
  file_name: 'image',
  file_extension: '.tiff',
  file_role: FILE_ROLE.DSM_GEOTIFF,
  file_status: '',
  id: '123',
};

const TEST_CHUNK_SIZE = 5000;
const NUM_FULL_CHUNKS = 2;
const PARTIAL_CHUNK_BYTES = 500;
const MOCK_FILE = new File(
  // Generate a fake image consisting of 2 full chunks, 1 partial
  [
    new Blob(
      new Array(TEST_CHUNK_SIZE * NUM_FULL_CHUNKS + PARTIAL_CHUNK_BYTES).fill(
        0,
      ),
    ),
  ],
  'image.tiff',
);

describe('Upload File', () => {
  function axiosUploadMock() {
    const mock = jest.spyOn(axiosMock, 'default');
    mock.mockImplementation(conf => {
      if (conf.url === '/network_plan/file/uploads') {
        // create upload session
        return Promise.resolve({
          data: MOCK_UPLOAD_SESSION_RESPONSE,
        });
      } else if (conf.url.includes('/network_plan/file/upload/')) {
        // upload chunk
        return Promise.resolve({
          data: MOCK_FILE_HANDLE_RESPONSE,
        });
      } else if (conf.url === '/network_plan/file') {
        // associate with ANP
        return Promise.resolve({
          data: MOCK_ANP_FILE,
        });
      }
      throw new Error('unhandled endpoint');
    });
    return mock;
  }
  test('creates an upload session and uploads a file in chunks', async () => {
    const mock = axiosUploadMock();
    const _response = await apiUtil.uploadFile({
      file: MOCK_FILE,
      role: FILE_ROLE.DSM_GEOTIFF,
      name: MOCK_FILE.name,
      uploadChunkSize: TEST_CHUNK_SIZE,
    });

    // axios request params for each api call
    const mockCalls = ((mock.mock.calls: any): Array<
      Array<AxiosXHRConfig<*, *>>,
    >);
    const sessionReq = mockCalls[0][0];
    const chunk1Req = mockCalls[1][0];
    const chunk2Req = mockCalls[2][0];
    const partialChunkReq = mockCalls[3][0];
    const anpFileReq = mockCalls[4][0];

    expect(sessionReq.url).toBe('/network_plan/file/uploads');
    expect(sessionReq.data).toMatchObject({
      file_length: MOCK_FILE.size,
      file_type: 'image/tiff',
      file_name: 'image',
    });

    const uploadSessionId = MOCK_UPLOAD_SESSION_RESPONSE.id;
    expect(chunk1Req).toMatchObject({
      url: `/network_plan/file/upload/${uploadSessionId}&chunkSize=${TEST_CHUNK_SIZE}`,
      data: expect.any(Blob),
      headers: {'Content-Type': 'multipart/form-data', file_offset: '0'},
    });
    expect(chunk2Req).toMatchObject({
      url: `/network_plan/file/upload/${uploadSessionId}&chunkSize=${TEST_CHUNK_SIZE}`,
      data: expect.any(Blob),
      headers: {
        'Content-Type': 'multipart/form-data',
        file_offset: TEST_CHUNK_SIZE.toString(),
      },
    });
    expect(partialChunkReq).toMatchObject({
      url: `/network_plan/file/upload/${uploadSessionId}&chunkSize=${PARTIAL_CHUNK_BYTES}`,
      data: expect.any(Blob),
      headers: {
        'Content-Type': 'multipart/form-data',
        file_offset: (TEST_CHUNK_SIZE * 2).toString(),
      },
    });
    expect(anpFileReq).toMatchObject({
      url: '/network_plan/file',
      method: 'PUT',
      data: {
        file_name: 'image',
        file_extension: 'tiff',
        file_role: FILE_ROLE.DSM_GEOTIFF,
        file_handle: MOCK_FILE_HANDLE_RESPONSE.h,
      },
    });
  });

  test('reports progress as the file is uploaded', async () => {
    const _mock = axiosUploadMock();
    const progressSpy = jest.fn();
    const _response = await apiUtil.uploadFile({
      file: MOCK_FILE,
      role: FILE_ROLE.DSM_GEOTIFF,
      name: MOCK_FILE.name,
      onProgress: progressSpy,
      uploadChunkSize: TEST_CHUNK_SIZE,
    });
    // one call for each chunk
    expect(progressSpy).toHaveBeenCalledTimes(3);
    expect(progressSpy).toHaveBeenNthCalledWith(1, 0);
    expect(progressSpy).toHaveBeenNthCalledWith(2, 50);
    expect(progressSpy).toHaveBeenNthCalledWith(3, 100);
  });
});
