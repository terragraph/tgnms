/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import 'jest-dom/extend-expect';
import * as React from 'react';
import ModalUpgradeImages from '../ModalUpgradeImages';
import axiosMock from 'axios';
import copyMock from 'copy-to-clipboard';
import {
  TestApp,
  initWindowConfig,
  renderAsync,
} from '../../../tests/testHelpers';
import {act, cleanup, fireEvent, waitForElement} from '@testing-library/react';
import type {UpgradeImageType} from '../../../../shared/types/Controller';

// fetches occur on an interval so we should mock them
jest.useFakeTimers();
jest.mock('axios');
jest.mock('copy-to-clipboard');

beforeEach(() => {
  initWindowConfig();
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
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
  const image = await waitForElement(() => getByText('image-1'));
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

  await waitForElement(() => getByText(/success/i));

  expect(axiosPostMock).toHaveBeenCalledWith(
    '/apiservice/test/api/delUpgradeImage',
    {name: 'image-1'},
    {},
  );
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
