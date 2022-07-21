/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
  if (status === null || status === undefined) {
    return <span style={{color: 'gray'}}>Unknown</span>;
  }
  return (
    <span style={{color: status ? 'green' : 'red'}}>
      {status ? trueText : falseText}
    </span>
  );
}
