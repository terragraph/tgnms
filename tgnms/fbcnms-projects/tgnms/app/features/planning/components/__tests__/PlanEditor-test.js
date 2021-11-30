/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as apiUtilMock from '@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil';
import PlanEditor from '../PlanEditor';
import {FILE_ROLE} from '@fbcnms/tg-nms/shared/dto/ANP';
import {NETWORK_PLAN_STATE} from '@fbcnms/tg-nms/shared/dto/NetworkPlan';
import {
  TestApp,
  coerceClass,
  mockInputFile,
  mockNetworkPlan,
  renderAsync,
  selectAutocompleteItem,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent} from '@testing-library/react';
import {waitForElementToBeRemoved, within} from '@testing-library/dom';
import type {ANPFileHandle} from '@fbcnms/tg-nms/shared/dto/ANP';
import type {RenderResult} from '@testing-library/react';

jest.mock('@fbcnms/tg-nms/app/apiutils/NetworkPlanningAPIUtil');

const commonProps: $Shape<React.ElementConfig<typeof PlanEditor>> = {
  folderId: '1',
  plan: mockNetworkPlan(),
  onPlanUpdated: jest.fn(),
  onPlanLaunched: jest.fn(),
};

test('initializes the form with the plan', async () => {
  const mockPlan = mockNetworkPlan({
    dsmFile: mockInputFile({
      id: 1,
      name: 'dsm.tiff',
    }),
    sitesFile: mockInputFile({
      id: 2,
      name: 'sites.csv',
    }),
    boundaryFile: mockInputFile({
      id: 3,
      name: 'boundary.kml',
    }),
  });
  const {getByLabelText} = await renderAsync(
    <TestApp>
      <PlanEditor {...commonProps} plan={mockPlan} />
    </TestApp>,
  );
  expect(coerceClass(getByLabelText('Plan Name'), HTMLInputElement).value).toBe(
    'test plan',
  );
  expect(coerceClass(getByLabelText('DSM File'), HTMLInputElement).value).toBe(
    mockPlan.dsmFile?.id?.toString(),
  );
  expect(
    coerceClass(getByLabelText('Sites File'), HTMLInputElement).value,
  ).toBe(mockPlan.sitesFile?.id?.toString());
  expect(
    coerceClass(getByLabelText('Boundary File'), HTMLInputElement).value,
  ).toBe(mockPlan.boundaryFile?.id?.toString());
});

test('initializes the form into a loading state when the plan is launching', async () => {
  const mockPlan = mockNetworkPlan({
    state: NETWORK_PLAN_STATE.UPLOADING_INPUTS, // in launching state
  });
  const {queryByText, queryByTestId} = await renderAsync(
    <TestApp>
      <PlanEditor {...commonProps} plan={mockPlan} />
    </TestApp>,
  );
  expect(queryByText('Start Plan')).not.toBeInTheDocument();
  expect(queryByTestId('launch-loading-circle')).toBeInTheDocument();
});

test('Uploading new files adds them to the form state', async () => {
  const updatePlanMock = jest
    .spyOn(apiUtilMock, 'updatePlan')
    .mockImplementation(() => Promise.resolve());
  let _fileidCounter = 1;
  jest
    .spyOn(apiUtilMock, 'createInputFile')
    .mockImplementation(file => ({id: _fileidCounter++, ...file}));
  jest
    .spyOn(apiUtilMock, 'uploadInputFileData')
    .mockImplementationOnce(() => Promise.resolve());
  const renderResult = await renderAsync(
    <TestApp>
      <PlanEditor {...commonProps} />
    </TestApp>,
  );
  const {getByLabelText} = renderResult;

  await testUploadInputFile(renderResult, 'select-dsm-file', {
    name: 'dsm.tiff',
    size: 100000,
  });
  await testUploadInputFile(renderResult, 'select-sites-file', {
    name: 'sites-file.csv',
    size: 1000,
  });
  await testUploadInputFile(renderResult, 'select-boundary-file', {
    name: 'boundary.kml',
    size: 10000,
  });
  // let the debounce trigger and save the plan.
  await new Promise(resolve => setTimeout(resolve, 1000));

  expect(coerceClass(getByLabelText('DSM File'), HTMLInputElement).value).toBe(
    '1',
  );
  expect(
    coerceClass(getByLabelText('Sites File'), HTMLInputElement).value,
  ).toBe('2');
  expect(
    coerceClass(getByLabelText('Boundary File'), HTMLInputElement).value,
  ).toBe('3');
  expect(updatePlanMock).toHaveBeenCalledWith({
    id: 1,
    name: 'test plan',
    dsmFileId: 1,
    sitesFileId: 2,
    boundaryFileId: 3,
  });
});

test('Selecting fbid files creates an input file if necessary', async () => {
  // https://github.com/facebook/jest/issues/3465#issuecomment-623393230
  jest.useFakeTimers('modern');
  const updatePlanMock = jest
    .spyOn(apiUtilMock, 'updatePlan')
    .mockImplementation(() => Promise.resolve());
  let _fileidCounter = 1;
  const createInputFileMock = jest
    .spyOn(apiUtilMock, 'createInputFile')
    .mockImplementation(file =>
      Promise.resolve({id: _fileidCounter++, ...file}),
    );
  jest
    .spyOn(apiUtilMock, 'uploadInputFileData')
    .mockImplementationOnce(() => Promise.resolve());
  jest.spyOn(apiUtilMock, 'getPlan').mockResolvedValueOnce(mockNetworkPlan());
  const renderResult = await renderAsync(
    <TestApp>
      <PlanEditor {...commonProps} />
    </TestApp>,
  );

  // Pass the set of ANPFileHandles for use in SelectANPPartnerFile
  await testSelectInputFile(
    renderResult,
    'select-dsm-file',
    [
      {
        id: '1',
        file_name: 'dsm-1',
        file_role: FILE_ROLE.DSM_GEOTIFF,
      },
      {
        id: '2',
        file_name: 'dsm-2',
        file_role: FILE_ROLE.DSM_GEOTIFF,
      },
    ],
    'dsm-2',
  );
  await testSelectInputFile(
    renderResult,
    'select-sites-file',
    [
      {
        id: '3',
        file_name: 'sites-1',
        file_role: FILE_ROLE.URBAN_SITE_FILE,
      },
      {
        id: '4',
        file_name: 'sites-2',
        file_role: FILE_ROLE.URBAN_SITE_FILE,
      },
    ],
    'sites-2',
  );
  await testSelectInputFile(
    renderResult,
    'select-boundary-file',
    [
      {
        id: '5',
        file_name: 'boundary-1',
        file_role: FILE_ROLE.URBAN_SITE_FILE,
      },
      {
        id: '6',
        file_name: 'boundary-2',
        file_role: FILE_ROLE.URBAN_SITE_FILE,
      },
    ],
    'boundary-2',
  );
  // let the debounce trigger and save the plan.
  await act(async () => {
    jest.runAllTimers();
  });
  expect(createInputFileMock).toHaveBeenCalledTimes(3);
  expect(updatePlanMock).toHaveBeenCalledWith({
    id: 1,
    name: 'test plan',
    dsmFileId: 1,
    boundaryFileId: 2,
    sitesFileId: 3,
  });
  jest.useRealTimers();
});
test.todo(
  'Selecting fbid files searches for an existing inputfile with the fbid',
);
/**
 * The PlanEditor form contains 3 instances of SelectOrUploadInputFile, one for
 * each of the input files. This function is equivalent to clicking the
 * "Browse" button for an input file, uploading a new input file, and clicking
 * confirm
 */
async function testUploadInputFile(
  {getByTestId, getByText}: RenderResult<>,
  inputId: string,
  file: $Shape<File>,
) {
  await act(async () => {
    fireEvent.click(getByTestId(`${inputId}-btn`));
  });
  const modal = getByTestId('select-or-upload-anpfile');
  await act(async () => {
    fireEvent.change(within(modal).getByTestId('fileInput'), {
      target: {files: [file]},
    });
  });
  await act(async () => {
    fireEvent.click(within(modal).getByText(/Start Upload/i));
  });
  await act(async () => {
    fireEvent.click(getByText(/Confirm/i));
  });

  await waitForElementToBeRemoved(() =>
    getByTestId('select-or-upload-anpfile'),
  );
}

/**
 * The PlanEditor form contains 3 instances of SelectOrUploadInputFile, one for
 * each of the input files. This function is equivalent to clicking the
 * "Browse" button for an input file, selecting a previously uploaded ANP file,
 * and clicking confirm
 */
async function testSelectInputFile(
  {getByTestId}: RenderResult<>,
  inputId: string,
  inputFiles: Array<$Shape<ANPFileHandle>>,
  fileName: string,
) {
  jest
    .spyOn(apiUtilMock, 'getPartnerFiles')
    .mockResolvedValue({data: inputFiles});
  await act(async () => {
    fireEvent.click(getByTestId(`${inputId}-btn`));
  });
  const modal = getByTestId('select-or-upload-anpfile');
  const autocomplete = within(
    within(modal).getByTestId(`${inputId}-partnerfile`),
  ).getByRole('textbox');
  selectAutocompleteItem(autocomplete, fileName);
  await act(async () => {
    fireEvent.click(within(modal).getByText(/Confirm/i));
  });
  await waitForElementToBeRemoved(() =>
    getByTestId('select-or-upload-anpfile'),
  );
}
