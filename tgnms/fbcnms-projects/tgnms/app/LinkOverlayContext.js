/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import React from 'react';

export type LinkOverlayContextType = {
  metricData: any,
};

// store link overlay/metric data
const LinkOverlayContext = React.createContext<LinkOverlayContextType>({});

export default LinkOverlayContext;
