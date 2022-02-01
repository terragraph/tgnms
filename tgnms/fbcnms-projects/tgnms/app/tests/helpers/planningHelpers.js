/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import {act, fireEvent} from '@testing-library/react';
import {selectAutocompleteItem} from '@fbcnms/tg-nms/app/tests/testHelpers';
import {waitForElementToBeRemoved, within} from '@testing-library/dom';

import type {RenderResult} from '@testing-library/react';

/**
 * Designed to fake-upload a file to a <ManageInputFile/> component.
 * Example:
 *
  const renderResult = render(<ManageInputFile {...props}/>);
  const {getByLabelText} = renderResult;
  await manageInputFileUpload(
    renderResult,
    renderResult.getByLabelText(/dsm file/i),
    {
      name: 'file.tiff',
      size: 1000,
    },
  );
 */
export async function manageInputFileUpload(
  {getByTestId}: RenderResult<>,
  autocomplete: HTMLElement,
  file: $Shape<File>,
) {
  selectAutocompleteItem(autocomplete, '+ New file');
  const modal = getByTestId('select-or-upload-anpfile');
  await act(async () => {
    fireEvent.change(within(modal).getByTestId('fileInput'), {
      target: {files: [file]},
    });
  });
  await act(async () => {
    fireEvent.click(within(modal).getByText(/Start Upload/i));
  });
  await waitForElementToBeRemoved(() =>
    getByTestId('select-or-upload-anpfile'),
  );
}
