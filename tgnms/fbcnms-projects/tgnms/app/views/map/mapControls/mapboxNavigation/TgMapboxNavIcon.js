/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import LocationOnIcon from '@material-ui/icons/LocationOn';
import RouterIcon from '@material-ui/icons/Router';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';

type Props = {
  resultType: $Values<typeof TOPOLOGY_ELEMENT>,
};

export default function TgMapboxNavIcon(props: Props) {
  const {resultType} = props;
  return resultType === TOPOLOGY_ELEMENT.NODE ? (
    <RouterIcon data-testid="node-search-icon" />
  ) : resultType === TOPOLOGY_ELEMENT.LINK ? (
    <CompareArrowsIcon />
  ) : (
    <LocationOnIcon />
  );
}
