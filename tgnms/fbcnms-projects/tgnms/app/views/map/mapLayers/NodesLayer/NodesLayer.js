/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import McsEstimateOverlay from '../McsEstimateLayer';
import NodeOverlay from './NodeOverlay';
import React from 'react';
import {OVERLAY_NONE} from '@fbcnms/tg-nms/app/constants/LayerConstants';
import type {Overlay} from '@fbcnms/tg-nms/app/features/map/NetworkMapTypes';

export type Props = {|
  overlayData: {[string]: number},
  overlay: Overlay,
|};

export default function NodesLayer({overlay, overlayData}: Props) {
  const {id} = overlay || {};
  if (!id || id === '') {
    return null;
  }
  return (
    <>
      {id !== OVERLAY_NONE.id && (
        <NodeOverlay overlay={overlay} overlayData={overlayData} />
      )}
      {id === 'mcs_estimate' && <McsEstimateOverlay />}
    </>
  );
}
