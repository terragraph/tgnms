/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as TopologyTemplateHelpersMock from '@fbcnms/tg-nms/app/helpers/TopologyTemplateHelpers';
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
  mockUploadTGJson,
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

test('uploads TG JSON file with required fields', async () => {
  const uploadTopologyBuilderRequestMock = jest.spyOn(
    TopologyTemplateHelpersMock,
    'uploadTopologyBuilderRequest',
  );

  const {getByText, getByTestId, getByDisplayValue} = await renderAsync(
    <TestApp>
      <UploadTopologyPanel {...defaultProps} />,
    </TestApp>,
  );
  // Gather elements
  const inputEl = cast<HTMLInputElement>(
    getByTestId('fileInput').firstElementChild,
  );
  // Change to TG JSON.
  await act(async () => {
    fireEvent.change(getByDisplayValue('ANP KML'), {
      target: {value: uploadFileTypes.TG},
    });
  });
  // Upload a file.
  await act(async () => {
    fireEvent.change(inputEl, {
      target: {
        files: [new File([mockUploadTGJson()], 'test.json', {type: '.json'})],
      },
    });
  });
  await forceCallbacks();

  act(() => {
    fireEvent.click(getByText('Upload'));
  });
  act(() => {
    fireEvent.click(getByTestId('confirm-add-topology-elements'));
  });

  expect(uploadTopologyBuilderRequestMock).toHaveBeenCalledWith(
    {
      // Copied from app/tests/data/topology_data/TG.json
      nodes: [
        {
          name: 'site1_2',
          node_type: 2,
          mac_addr: '',
          pop_node: false,
          status: 1,
          wlan_mac_addrs: [],
          site_name: 'site1',
          ant_azimuth: 279,
          ant_elevation: 0,
          prefix: '2620:10d:c089:af51::/64',
        },
        {
          name: 'site2_0',
          node_type: 1,
          mac_addr: '',
          pop_node: false,
          status: 1,
          wlan_mac_addrs: [],
          site_name: 'site2',
          ant_azimuth: 115.84550667643184,
          ant_elevation: 0,
          prefix: '2620:10d:c089:af52::/64',
        },
      ],
      links: [
        {
          name: 'link-site1_2-site2_0',
          a_node_name: 'site1_2',
          z_node_name: 'site2_0',
          link_type: 0,
          is_alive: false,
          linkup_attempts: 0,
          a_node_mac: '',
          z_node_mac: '',
        },
      ],
      sites: [
        {
          name: 'site1',
          location: {
            latitude: 38.549853,
            longitude: -121.779472,
            altitude: 26.367722,
            accuracy: 40000000,
          },
        },
        {
          name: 'site2',
          location: {
            latitude: 38.550253,
            longitude: -121.781208,
            altitude: 27.795412,
            accuracy: 40000000,
          },
        },
      ],
    },
    '',
    expect.anything(),
  );
});
