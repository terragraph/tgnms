/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import UploadTopologyPanel from '../UploadTopologyPanel';
import {
  TestApp,
  cast,
  mockPanelControl,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, render} from '@testing-library/react';
import {
  mockUploadANPJson,
  mockUploadANPKml,
} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';
import {uploadFileTypes} from '@fbcnms/tg-nms/app/constants/TemplateConstants';

jest.setTimeout(30000);

/**
 * This function forces the remaining callbacks in the code to run.
 *
 * FileReader.onloadend isn't considered a Promise, but rather
 * an event handler; so the first `act` doesn't wait for the
 * FileReader.onloadend to run.
 *
 * This code forces a test to add itself back onto the event-loop and allow
 * the callback in the source code to run.
 *    start_test -> source_code -> test (forceCallbacks) -> source_code -> end
 */
const forceCallbacks = async function () {
  await act(async () => {
    await new Promise(r => setTimeout(r, 1));
  });
};

const defaultProps = {
  panelControl: mockPanelControl({
    getIsOpen: jest.fn().mockReturnValue(true),
    getIsHidden: jest.fn().mockReturnValue(false),
  }),
};

test('renders empty without crashing', () => {
  const {getByText} = render(
    <TestApp>
      <UploadTopologyPanel {...defaultProps} />
    </TestApp>,
  );
  expect(getByText('Select File')).toBeInTheDocument();
});

test('selected file gets registered and enables upload button', async () => {
  const {getByTestId, getByText} = await renderAsync(
    <TestApp>
      <UploadTopologyPanel {...defaultProps} />,
    </TestApp>,
  );

  // Get DOM elements.
  const wrapper = cast<HTMLElement & {files: Array<File>}>(
    getByTestId('fileInput'),
  );
  const inputEl = cast<HTMLInputElement>(wrapper.firstElementChild);

  // Assert Upload button is disabled.
  const uploadButton = getByText('Upload').parentElement;
  expect(uploadButton).toBeDisabled();

  // Trigger file upload.
  const file = new File([mockUploadANPKml()], 'test.kml', {type: '.kml'});
  await act(async () => {
    fireEvent.change(inputEl, {
      target: {files: [file]},
    });
  });
  await forceCallbacks(); // See docstring for explanation.

  expect(inputEl.files[0].name).toBe('test.kml');
  expect(uploadButton).toBeEnabled();
});

test('changing file format changes acceptable input files', async () => {
  const {getByTestId, getByDisplayValue} = await renderAsync(
    <TestApp>
      <UploadTopologyPanel {...defaultProps} />,
    </TestApp>,
  );
  const inputEl = getByTestId('fileInput');
  // Default is kml.
  expect(cast<HTMLInputElement>(inputEl.firstChild).accept).toBe('.kml');

  // Change to TG JSON.
  await act(async () => {
    fireEvent.change(getByDisplayValue('ANP KML'), {
      target: {value: uploadFileTypes.TG},
    });
  });
  expect(cast<HTMLInputElement>(inputEl.firstChild).accept).toBe('.json');

  // Change back to ANP KML.
  await act(async () => {
    fireEvent.change(getByDisplayValue('TG JSON'), {
      target: {value: uploadFileTypes.KML},
    });
  });
  expect(cast<HTMLInputElement>(inputEl.firstChild).accept).toBe('.kml');
});

test('changing input parameters forces user to reselect file', async () => {
  const {getByText, getByTestId, getByDisplayValue} = await renderAsync(
    <TestApp>
      <UploadTopologyPanel {...defaultProps} />,
    </TestApp>,
  );

  // Gather elements
  const inputEl = cast<HTMLInputElement>(
    getByTestId('fileInput').firstElementChild,
  );
  const uploadButton = getByText('Upload').parentElement;

  // Assert Upload button disabled.
  expect(uploadButton).toBeDisabled(); // Disabled

  // Upload a file.
  await act(async () => {
    fireEvent.change(inputEl, {
      target: {
        files: [new File([mockUploadANPKml()], 'test.kml', {type: '.kml'})],
      },
    });
  });
  await forceCallbacks();
  expect(uploadButton).toBeEnabled(); // Enabled

  // Change sector count.
  await act(async () => {
    fireEvent.change(getByDisplayValue('4'), {
      target: {value: '3'},
    });
  });
  expect(uploadButton).toBeDisabled(); // Disabled

  // Upload a file.
  await act(async () => {
    fireEvent.change(inputEl, {
      target: {
        files: [new File([mockUploadANPKml()], 'test.kml', {type: '.kml'})],
      },
    });
  });
  await forceCallbacks();
  expect(uploadButton).toBeEnabled(); // Enabled

  // Change file format to ANP JSON.
  fireEvent.change(getByDisplayValue('ANP KML'), {
    target: {value: uploadFileTypes.ANP},
  });
  expect(uploadButton).toBeDisabled(); // Disabled

  // Upload a file.
  await act(async () => {
    fireEvent.change(inputEl, {
      target: {
        files: [new File([mockUploadANPJson()], 'test.json', {type: '.json'})],
      },
    });
  });
  await forceCallbacks();
  expect(uploadButton).toBeEnabled(); // Enabled
});

test('clicking close calls onClose', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <UploadTopologyPanel {...defaultProps} />,
    </TestApp>,
  );
  fireEvent.click(getByText('Cancel'));
});
