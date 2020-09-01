/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import {useModalState} from '../../hooks/modalHooks';
import type {Props as BtnProps} from '@material-ui/core/IconButton/IconButton';

type UniqueProps = {|
  id: string,
  icon: React.Node,
  children: React.Node,
|};

export type Props = {|
  ...$Exact<BtnProps>,
  ...UniqueProps,
|};

export default function MenuIconButton({id, children, icon, ...props}: Props) {
  const {isOpen, open, close} = useModalState();
  const ref = React.useRef<any>();
  return (
    <>
      <IconButton
        ref={ref}
        onClick={open}
        aria-controls={id}
        aria-haspopup="true"
        data-testid={`${id}-button`}
        {...(props: $Rest<Props, UniqueProps>)}>
        {icon}
      </IconButton>
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
