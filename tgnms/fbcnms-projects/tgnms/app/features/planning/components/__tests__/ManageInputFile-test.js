/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as apiUtil from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import ManageInputFile from '../ManageInputFile';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {NetworkPlanningContextProvider} from '@fbcnms/tg-nms/app/contexts/NetworkPlanningContext';
import {
  TestApp,
  renderAsync,
  selectAutocompleteItem,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {manageInputFileUpload} from '@fbcnms/tg-nms/app/tests/helpers/planningHelpers';
import type {AddJestTypes} from 'jest';
import type {InputFile} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');
const apiMock: $ObjMapi<typeof apiUtil, AddJestTypes> = apiUtil;
let _fileidCounter = 1;
apiMock.createInputFile.mockImplementation(file => ({
  id: _fileidCounter++,
  ...file,
}));
apiMock.uploadInputFileData.mockImplementationOnce(() => Promise.resolve());
apiMock.getInputFiles.mockImplementation(({role: _}) =>
  Promise.resolve([
    {
      id: 1,
      name: 'dsm-1',
      role: FILE_ROLE.DSM_GEOTIFF,
    },
    {
      id: 2,
      name: 'dsm-2',
      role: FILE_ROLE.DSM_GEOTIFF,
    },
  ]),
);
const commonProps = {
  id: 'select-test-file',
  label: 'Select Test File',
  role: FILE_ROLE.DSM_GEOTIFF,
  fileTypes: '.tiff',
  onChange: jest.fn(),
  initialValue: null,
};

describe('Upload new file', () => {
  test('creates an input file and uploads filedata', async () => {
    const renderResult = await renderTest();
    await manageInputFileUpload(
      renderResult,
      renderResult.getByLabelText(/test file/i),
      {
        name: 'new-test-file.tiff',
        size: 100000,
      },
    );
    expect(apiMock.createInputFile).toHaveBeenLastCalledWith({
      name: 'new-test-file.tiff',
      role: FILE_ROLE.DSM_GEOTIFF,
      source: 'local',
    });
    const createInputFileMock = apiMock.createInputFile.mock;
    const fileId = createInputFileMock.results[0].value?.id;
    expect(fileId).toEqual(expect.any(Number));
    expect(apiMock.uploadInputFileData).toHaveBeenCalledWith(
      expect.objectContaining({fileId}),
    );
  });
  test('calls onChange with the created InputFile', async () => {
    const renderResult = await renderTest();
    await manageInputFileUpload(
      renderResult,
      renderResult.getByLabelText(/test file/i),
      {
        name: 'new-test-file.tiff',
        size: 100000,
      },
    );
    const createInputFileMock = apiMock.createInputFile.mock;
    const lastCreatedFile: InputFile = createInputFileMock.results.slice(-1)[0]
      .value;
    expect(commonProps.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'new-test-file.tiff',
        role: FILE_ROLE.DSM_GEOTIFF,
        id: lastCreatedFile.id,
      }),
    );
    // make sure the ui element shows the uploaded filename
    expect(
      renderResult.getByDisplayValue('new-test-file.tiff'),
    ).toBeInTheDocument();
  });
});
describe('Select existing file', () => {
  test('changes to the selected InputFile', async () => {
    const {getByLabelText, getByDisplayValue} = await renderTest();
    selectAutocompleteItem(getByLabelText(/test file/i), 'dsm-2', {
      selectOffset: 1,
    });
    expect(apiMock.getInputFiles).toHaveBeenCalled();
    expect(commonProps.onChange).toHaveBeenLastCalledWith({
      id: 2,
      name: 'dsm-2',
      role: FILE_ROLE.DSM_GEOTIFF,
    });
    // make sure the ui element shows the uploaded filename
    expect(getByDisplayValue('dsm-2')).toBeInTheDocument();
  });
});

function renderTest(
  props?: $Shape<React.ElementConfig<typeof ManageInputFile>>,
) {
  return renderAsync(
    <TestApp>
      <NetworkPlanningContextProvider>
        <ManageInputFile {...commonProps} {...props} />
      </NetworkPlanningContextProvider>
    </TestApp>,
  );
}
