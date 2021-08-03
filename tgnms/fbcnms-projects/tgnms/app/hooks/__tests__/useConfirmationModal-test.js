/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import * as modalHooks from '@fbcnms/tg-nms/app/hooks/modalHooks';
import * as serviceApiUtil from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import useConfirmationModal from '../useConfirmationModal';
import {act, renderHook} from '@testing-library/react-hooks';
import {fireEvent, render} from '@testing-library/react';

jest
  .spyOn(serviceApiUtil, 'apiServiceRequest')
  .mockImplementation(() => Promise.resolve({data: {}}));

const snackbarsMock = {
  error: jest.fn(),
  success: jest.fn(),
};

jest
  .spyOn(require('../useSnackbar'), 'useSnackbars')
  .mockReturnValue(snackbarsMock);

const useConfirmationModalStateMock = {
  isOpen: true,
  cancel: jest.fn(),
  confirm: jest.fn(),
  requestConfirmation: jest.fn(),
};
jest
  .spyOn(modalHooks, 'useConfirmationModalState')
  .mockReturnValue(useConfirmationModalStateMock);

const mockOnSuccess = jest.fn();
const defaultProps = {onSuccess: mockOnSuccess};
const defaultModalProps = {title: 'testTitle', content: 'testContent'};

describe('useConfirmationModal', () => {
  test('calling useConfirmationModal returns the callack to render modal and function to open the modal', () => {
    const {result} = renderHook(() => useConfirmationModal(defaultProps));
    expect(result.current.openConfirmation).toBeFunction;
    expect(result.current.ConfirmationModal).toBeFunction;
  });

  test('calling openConfirmation triggers requestConfirmation', () => {
    const {result} = renderHook(() => useConfirmationModal(defaultProps));
    const {openConfirmation} = result.current;
    act(() => {
      openConfirmation({
        endpoint: 'test',
        data: {},
        successMessage: 'success test message',
      });
    });
    expect(
      useConfirmationModalStateMock.requestConfirmation,
    ).toHaveBeenCalled();
  });

  test('if modal is open, title and conent render correctly', () => {
    const {result} = renderHook(() => useConfirmationModal(defaultProps));
    const {ConfirmationModal} = result.current;
    const {getByText} = render(<ConfirmationModal {...defaultModalProps} />);
    expect(getByText('testTitle')).toBeInTheDocument();
    expect(getByText('testContent')).toBeInTheDocument();
  });

  test('confirm button calls confirm', () => {
    const {result} = renderHook(() => useConfirmationModal(defaultProps));
    const {ConfirmationModal} = result.current;
    const {getByText} = render(<ConfirmationModal {...defaultModalProps} />);
    fireEvent.click(getByText('Confirm'));
    expect(useConfirmationModalStateMock.confirm).toHaveBeenCalled();
  });

  test('cancel button calls cancel', () => {
    const {result} = renderHook(() => useConfirmationModal(defaultProps));
    const {ConfirmationModal} = result.current;
    const {getByText} = render(<ConfirmationModal {...defaultModalProps} />);
    fireEvent.click(getByText('Cancel'));
    expect(useConfirmationModalStateMock.cancel).toHaveBeenCalled();
  });
});
