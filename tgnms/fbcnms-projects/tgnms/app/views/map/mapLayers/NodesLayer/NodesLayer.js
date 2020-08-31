/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import McsEstimateOverlay from '../McsEstimateLayer';
import NodeBearingOverlay from './NodeBearingOverlay';
import React from 'react';
import type {Overlay} from '../../NetworkMapTypes';

export type Props = {|
  overlay: Overlay,
|};
export default function NodesLayer({overlay}: Props) {
  const {id} = overlay || {};
  return (
    <>
      {id === 'bearing' && <NodeBearingOverlay />}
      {id === 'mcs_estimate' && <McsEstimateOverlay />}
    </>
  );
}
