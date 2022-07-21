/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Tooltip from '@material-ui/core/Tooltip';
import {makeStyles} from '@material-ui/styles';

type Props = {|
  message: string,
  size: number,
|};

const useStyles = makeStyles(_theme => ({
  icon: {
    width: props => props.size,
    marginRight: props => -props.size,
    fontSize: props => props.size,
  },
}));

export default function HelpTooltip({message, ...props}: Props) {
  const classes = useStyles(props);
  return (
    <span>
      <Tooltip title={message} placement="top-start">
        <HelpOutlineIcon className={classes.icon} fontSize="small" />
      </Tooltip>
    </span>
  );
}

HelpTooltip.defaultProps = {
  size: 15,
};
