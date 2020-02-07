/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 * Converts from text separated by a separator to friendly text:
 * WIRED_LINK_STATUS -> Wired Link Status
 * wired-link-status -> Wired Link Status
 */
// flowlint inexact-spread:off

import * as React from 'react';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import type {TypographyProps} from '@material-ui/core/Typography/Typography';

export type Props = {
  ...TypographyProps,
  text: string,
  separator: string,
  stripPrefix?: string,
  disableTypography?: boolean,
};

const useStyles = makeStyles(_theme => ({
  text: {
    textTransform: 'capitalize',
  },
}));

export default function FriendlyText({
  text,
  separator,
  stripPrefix,
  disableTypography,
  ...typographyProps
}: Props) {
  const classes = useStyles();
  const converted = React.useMemo(() => {
    if (!text || text === '') {
      return '';
    }
    if (!separator || separator === '') {
      return text;
    }
    let _text = text;
    if (typeof stripPrefix === 'string') {
      _text = _text.replace(
        new RegExp(`^${stripPrefix}${separator}*`, 'i'),
        '',
      );
    }
    return _text
      .toLowerCase()
      .split(separator)
      .filter(x => x && x.trim() !== '')
      .join(' ');
  }, [text, separator, stripPrefix]);

  if (disableTypography === true) {
    return (
      <span className={classes.text} {...typographyProps}>
        {converted}
      </span>
    );
  }
  return (
    <Typography className={classes.text} {...typographyProps}>
      {converted}
    </Typography>
  );
}
