/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Collapse from '@material-ui/core/Collapse';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import {makeStyles} from '@material-ui/styles';

type Props = {
  children: React.Node,
  title?: string,
};

const useStyles = makeStyles(theme => ({
  switch: {
    paddingBottom: theme.spacing(2),
  },
}));

export default function ShowAdvanced(props: Props) {
  const classes = useStyles();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const {children, title} = props;

  const toggleAdvanced = React.useCallback(
    () => setShowAdvanced(!showAdvanced),
    [showAdvanced, setShowAdvanced],
  );
  return (
    <>
      <FormControlLabel
        className={showAdvanced ? classes.switch : ''}
        control={
          <Switch
            color="primary"
            checked={showAdvanced}
            onChange={toggleAdvanced}
          />
        }
        label={title ? title : 'Show Advanced'}
      />
      <Collapse in={showAdvanced}>{children}</Collapse>
    </>
  );
}
