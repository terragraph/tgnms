/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import React, {useCallback, useState} from 'react';

type Props = {
  leftText: string,
  rightText: string,
  leftOnclick: () => void,
  rightOnclick: () => void,
};

export default function TabbedButton(props: Props) {
  const {leftText, rightText, leftOnclick, rightOnclick} = props;
  const [leftSelected, setLeftSelected] = useState(true);

  const handleLeftClick = useCallback(() => {
    leftOnclick();
    setLeftSelected(true);
  }, [setLeftSelected, leftOnclick]);

  const handleRightClick = useCallback(() => {
    rightOnclick();
    setLeftSelected(false);
  }, [setLeftSelected, rightOnclick]);

  return (
    <ButtonGroup fullWidth>
      <Button
        variant="contained"
        color={leftSelected ? 'secondary' : 'default'}
        onClick={handleLeftClick}>
        {leftText}
      </Button>
      <Button
        variant="contained"
        color={leftSelected ? 'default' : 'secondary'}
        onClick={handleRightClick}>
        {rightText}
      </Button>
    </ButtonGroup>
  );
}
