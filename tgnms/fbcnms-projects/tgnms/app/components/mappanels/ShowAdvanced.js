/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Collapse from '@material-ui/core/Collapse';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

type Props = {
  children: Array<React.Node>,
};

export default function ShowAdvanced(props: Props) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const {children} = props;

  const toggleAdvanced = React.useCallback(
    () => setShowAdvanced(!showAdvanced),
    [showAdvanced, setShowAdvanced],
  );
  return (
    <>
      <Collapse in={showAdvanced}>{children}</Collapse>
      <FormControlLabel
        control={
          <Switch
            color="primary"
            checked={showAdvanced}
            onChange={toggleAdvanced}
          />
        }
        label="Show Advanced"
      />
    </>
  );
}
