/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 */

//Ref forwarding required for components need access to the DOM node
import * as React from 'react';
import {NavLink} from 'react-router-dom';

export default React.forwardRef<*, *>((props, ref) => (
  <NavLink {...props} innerRef={ref} />
));
