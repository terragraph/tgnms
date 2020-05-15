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
import {makeStyles} from '@material-ui/styles';

type Props = {
  children: React.Node,
};

const useStyles = makeStyles(theme => ({
  switch: {
    paddingBottom: theme.spacing(2),
  },
}));

export default function ShowAdvanced(props: Props) {
  const classes = useStyles();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const {children} = props;

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
        label="Show Advanced"
      />
      <Collapse in={showAdvanced}>{children}</Collapse>
    </>
  );
}
