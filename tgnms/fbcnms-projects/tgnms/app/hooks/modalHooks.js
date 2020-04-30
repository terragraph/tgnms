/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';

export type ConfirmationModalState = {
  isOpen: boolean,
  requestConfirmation: (onConfig: () => *) => void,
  confirm: () => void,
  cancel: () => void,
};

export function useConfirmationModalState(): ConfirmationModalState {
  const onConfirmRef = React.useRef();
  const [isOpen, setIsOpen] = React.useState(false);
  const requestConfirmation = React.useCallback(
    conf => {
      setIsOpen(true);
      onConfirmRef.current = conf;
    },
    [setIsOpen],
  );
  const confirm = React.useCallback(() => {
    setIsOpen(false);
    if (typeof onConfirmRef.current === 'function') {
      onConfirmRef.current();
    }
  }, [setIsOpen, onConfirmRef]);
  const cancel = React.useCallback(() => {
    setIsOpen(false);
  }, []);
  return {
    isOpen,
    requestConfirmation,
    confirm,
    cancel,
  };
}
