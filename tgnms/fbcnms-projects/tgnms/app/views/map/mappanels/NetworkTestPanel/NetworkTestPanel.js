/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import TestExecutionSummary from './TestExecutionSummary';
import {MAPMODE, useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {getUrlSearchParam} from '@fbcnms/tg-nms/app/helpers/NetworkUrlHelpers';
import {useHistory} from 'react-router';

type Props = {
  networkTestId: ?string,
  expanded: boolean,
};

export default function NetworkTestPanel(props: Props) {
  const {expanded, networkTestId} = props;
  const history = useHistory();
  const historyRef = React.useRef(history);

  const {setMapMode} = useMapContext();

  const onClose = React.useCallback(() => {
    const urlWithoutOverlay = new URL(window.location);
    const path = urlWithoutOverlay.pathname;
    urlWithoutOverlay.pathname = path.slice(0, path.lastIndexOf('/'));
    urlWithoutOverlay.searchParams.delete('test');
    urlWithoutOverlay.searchParams.delete('mapMode');
    historyRef.current.replace(
      `${urlWithoutOverlay.pathname}${urlWithoutOverlay.search}`,
    );
  }, [historyRef]);

  const handleNetworkTestClose = React.useCallback(() => {
    setMapMode(MAPMODE.DEFAULT);
    onClose();
  }, [onClose, setMapMode]);

  React.useEffect(() => {
    if (getUrlSearchParam('mapMode', location) !== MAPMODE.NETWORK_TEST) {
      setMapMode(MAPMODE.DEFAULT);
    }
  }, [setMapMode]);

  if (!networkTestId) {
    return null;
  }

  return (
    <CustomAccordion
      title="Network Test"
      expanded={expanded}
      onClose={handleNetworkTestClose}
      details={<TestExecutionSummary networkTestId={networkTestId} />}
    />
  );
}
