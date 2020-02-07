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
import {TopologyElementType} from '../../constants/NetworkConstants';

type Props = {
  resultType: $Values<typeof TopologyElementType>,
};

export default function TgMapboxGeocoderIcon(props: Props) {
  const {resultType} = props;
  return resultType === TopologyElementType.NODE ? (
    <RouterIcon />
  ) : resultType === TopologyElementType.LINK ? (
    <CompareArrowsIcon />
  ) : (
    <LocationOnIcon />
  );
}
