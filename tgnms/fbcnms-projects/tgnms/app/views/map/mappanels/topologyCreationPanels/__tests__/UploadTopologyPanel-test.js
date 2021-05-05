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
import {fireEvent, render} from '@testing-library/react';
import {mockUploadJson} from '@fbcnms/tg-nms/app/tests/data/UploadTopology';

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

test('clicking button opens file selector', async () => {
  const {getByTestId} = await renderAsync(
    <TestApp>
      <UploadTopologyPanel {...defaultProps} />,
    </TestApp>,
  );

  const inputEl = cast<HTMLElement & {files: Array<File>}>(
    getByTestId('fileInput'),
  );
  const file = new File([mockUploadJson()], 'test.json', {type: '.json'});
  Object.defineProperty(inputEl, 'files', {value: [file]});

  fireEvent.change(inputEl);
  expect(inputEl.files[0].name === 'test.json');
});

test('clicking close calls onClose', async () => {
  const {getByText} = await renderAsync(
    <TestApp>
      <UploadTopologyPanel {...defaultProps} />,
    </TestApp>,
  );
  fireEvent.click(getByText('Cancel'));
});
