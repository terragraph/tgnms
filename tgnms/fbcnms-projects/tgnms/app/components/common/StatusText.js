/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';

type Props = {
  status: ?boolean,
  trueText?: ?string,
  falseText?: ?string,
};

export default function StatusText(props: Props) {
  const {status} = props;
  const trueText = props.trueText ? props.trueText : 'Online';
  const falseText = props.falseText ? props.falseText : 'Offline';
  if (status === null) {
    return <span style={{color: 'gray'}}>Unknown</span>;
  }
  return (
    <span style={{color: status ? 'green' : 'red'}}>
      {status ? trueText : falseText}
    </span>
  );
}
