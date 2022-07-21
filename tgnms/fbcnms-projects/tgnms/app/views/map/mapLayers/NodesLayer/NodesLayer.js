/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
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
