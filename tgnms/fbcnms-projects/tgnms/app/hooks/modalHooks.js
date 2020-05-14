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

/**
 * Use for modals and menus which need to be opened and closed
 */
export function useModalState(): {
  isOpen: boolean,
  open: () => void,
  close: () => void,
} {
  const [isOpen, setIsOpen] = React.useState(false);
  const open = React.useCallback(() => setIsOpen(true), [setIsOpen]);
  const close = React.useCallback(() => setIsOpen(false), [setIsOpen]);
  return {
    isOpen,
    setIsOpen,
    open,
    close,
  };
}
