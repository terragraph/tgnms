/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import React from 'react';
import Typography from '@material-ui/core/Typography';
import {HEALTH_CODES} from '../../../constants/HealthConstants';
import {SCAN_INTERFERENCE_CUTOFFS} from './ScanInterference';
import {useRouteContext} from '../../../contexts/RouteContext';

import type {LinkInterferenceType} from '../../../../shared/dto/ScanServiceTypes';

type Props = {linkInterference?: LinkInterferenceType};

export default function LinkInterference(props: Props) {
  const {linkInterference} = props;
  const routes = useRouteContext();
  const routesRef = React.useRef(routes);

  React.useEffect(() => {
    if (linkInterference) {
      const links = linkInterference.interference.reduce(
        (final, link) => {
          final[link.interferenceLinkName] = HEALTH_CODES.POOR;
          return final;
        },
        {[linkInterference.assetName]: linkInterference.health},
      );

      routesRef.current.onUpdateRoutes({
        node: null,
        links,
        nodes: new Set(),
      });
    }
  }, [routesRef, linkInterference]);

  return linkInterference == null ||
    linkInterference.totalINR < SCAN_INTERFERENCE_CUTOFFS.WEAK ? (
    <Typography variant="h6">No Interference!</Typography>
  ) : (
    <>
      <Typography variant="h6">{linkInterference.assetName}</Typography>
      <Typography variant="button">Overall Interference:</Typography>
      {linkInterference.totalINR} dB
      <Typography variant="button">Top Interferers:</Typography>
      {linkInterference.interference.map(({interferenceLinkName, INR}) => (
        <Typography>
          {interferenceLinkName}: {INR} dB
        </Typography>
      ))}
    </>
  );
}
