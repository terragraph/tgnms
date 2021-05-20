/**
 * Copyright 2004-present Facebook. All Rights Reserved.
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
