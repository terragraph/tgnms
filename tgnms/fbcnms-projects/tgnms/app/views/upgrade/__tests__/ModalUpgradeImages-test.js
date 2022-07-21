/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import ModalUpgradeImages from '../ModalUpgradeImages';
import axiosMock from 'axios';
import copyMock from 'copy-to-clipboard';
import {
  TestApp,
  initWindowConfig,
  renderAsync,
} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {act, fireEvent, waitFor} from '@testing-library/react';
import type {UpgradeImageType} from '@fbcnms/tg-nms/shared/types/Controller';

// fetches occur on an interval so we should mock them
jest.useFakeTimers();
jest.mock('axios');
jest.mock('copy-to-clipboard');

beforeEach(() => {
  initWindowConfig();
});

test('clicking the button opens the modal', async () => {
  createAxiosPostMock({
    images: [],
  });
  await renderAndOpenModal(
    <TestApp>
      <ModalUpgradeImages networkName="test" />
    </TestApp>,
  );
});

test('renders images from controller', async () => {
  const axiosPostMock = createAxiosPostMock({
    images: [mockImage()],
  });
  const {getByText} = await renderAndOpenModal(
    <TestApp>
      <ModalUpgradeImages networkName="test" />
    </TestApp>,
  );
  const image = await waitFor(() => getByText('image-1'));
  expect(image).toBeInTheDocument();
  expect(axiosPostMock).toHaveBeenCalledWith(
    '/apiservice/test/api/listUpgradeImages',
    {},
    {},
  );
});

test('clicking refresh images button refetches images', async () => {
  const axiosPostMock = createAxiosPostMock({
    images: [mockImage()],
  });
  const {getByTestId} = await renderAndOpenModal(
    <TestApp>
      <ModalUpgradeImages networkName="test" />
    </TestApp>,
  );

  expect(axiosPostMock).toHaveBeenCalledTimes(1);
  act(() => {
    fireEvent.click(getByTestId('refresh-images'));
  });
  expect(axiosPostMock).toHaveBeenCalledTimes(2);
});

test("clicking copy magnet uri invokes the browser's copy function", async () => {
  createAxiosPostMock({
    images: [mockImage()],
  });

  const {getByText, getByTestId} = await renderAndOpenModal(
    <TestApp>
      <ModalUpgradeImages networkName="test" />
    </TestApp>,
  );

  act(() => {
    fireEvent.click(getByTestId('open-menu'));
  });
  act(() => {
    fireEvent.click(getByText(/copy magnet uri/i));
  });
  expect(copyMock).toHaveBeenCalledWith('magnet://magnetlink');
});

test('clicking delete image button sends a delete request', async () => {
  const axiosPostMock = createAxiosPostMock({
    images: [mockImage()],
  });

  const {getByText, getByTestId} = await renderAndOpenModal(
    <TestApp>
      <ModalUpgradeImages networkName="test" />
    </TestApp>,
  );

  act(() => {
    fireEvent.click(getByTestId('open-menu'));
  });
  act(() => {
    fireEvent.click(getByText(/delete image/i));
  });
  // async act because confirm fires off an async request
  await act(async () => {
    fireEvent.click(getByText(/confirm/i));
  });

  await waitFor(() => getByText(/success/i));

  expect(axiosPostMock).toHaveBeenCalledWith(
    '/apiservice/test/api/delUpgradeImage',
    {name: 'image-1'},
    {},
  );
});

test('if software portal is enabled, images from software portal are shown', async () => {
  initWindowConfig({
    featureFlags: {SOFTWARE_PORTAL_ENABLED: true},
  });
  const fetchUpgradeImagesMock = jest
    .spyOn(
      require('@fbcnms/tg-nms/app/helpers/UpgradeHelpers'),
      'fetchUpgradeImages',
    )
    .mockResolvedValueOnce([]);
  const fetchSwPortalMock = jest
    .spyOn(
      require('@fbcnms/tg-nms/app/helpers/UpgradeHelpers'),
      'fetchSoftwarePortalImages',
    )
    .mockResolvedValueOnce([]);
  const {getByText} = await renderAndOpenModal(
    <TestApp>
      <ModalUpgradeImages networkName="test" />
    </TestApp>,
  );
  expect(getByText('Software Portal Images')).toBeInTheDocument();
  expect(fetchSwPortalMock).toHaveBeenCalled();
  expect(fetchUpgradeImagesMock).toHaveBeenCalled();
});

async function renderAndOpenModal(component: React.Node) {
  /**
   * baseElement specifies which element to bind the queries to. Since we're
   * working with a modal rendered in a portal, we cannot query on the default
   * element.
   */
  const result = await renderAsync(component, {baseElement: document.body});
  const button = result.getByText('Manage Upgrade Images');
  expect(button).toBeInTheDocument();
  act(() => {
    fireEvent.click(button);
  });
  // since modals are in a portal, normal getByText queries will not work
  const modal = result.getByTestId('upgrade-modal');
  expect(modal).toBeInTheDocument();
  return result;
}

function createAxiosPostMock(data: Object) {
  const mock = jest
    .spyOn(axiosMock, 'post')
    //fetch upgrade images
    .mockImplementation(
      jest.fn(() => {
        return Promise.resolve({
          data: data || {},
        });
      }),
    );
  return mock;
}

function mockImage(): UpgradeImageType {
  return {
    name: 'image-1',
    magnetUri: 'magnet://magnetlink',
    md5: 'abc123',
    hardwareBoardIds: [],
  };
}
