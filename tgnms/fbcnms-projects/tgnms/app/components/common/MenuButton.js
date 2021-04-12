/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';

export default function MenuButton({
  id,
  children,
  label,
}: {
  id: string,
  label: React.Node,
  children: React.Node,
}) {
  const {isOpen, open, close} = useModalState();
  const ref = React.useRef<any>();
  return (
    <>
      <Button
        ref={ref}
        onClick={open}
        aria-controls={id}
        aria-haspopup="true"
        data-testid={`${id}-button`}>
        {label}
      </Button>
      <Menu
        onClose={close}
        open={isOpen}
        id={id}
        data-testid={id}
        anchorEl={ref.current}>
        {children}
      </Menu>
    </>
  );
}
