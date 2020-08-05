/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CustomAccordion from '../../common/CustomAccordion';
import NmsOptionsContext from '../../../contexts/NmsOptionsContext';
import ScanServiceSummary from './ScanServiceSummary';
import {MAPMODE, useMapContext} from '../../../contexts/MapContext';
import {withRouter} from 'react-router-dom';

import type {ContextRouter} from 'react-router-dom';

type Props = {
  scanId: ?string,
  expanded: boolean,
} & ContextRouter;

export default withRouter(function ScanServicePanel(props: Props) {
  const {expanded, history, scanId} = props;
  const {setMapMode} = useMapContext();
  const historyRef = React.useRef(history);
  const {updateNetworkMapOptions} = React.useContext(NmsOptionsContext);

  const onClose = React.useCallback(() => {
    const urlWithoutOverlay = new URL(window.location);
    const path = urlWithoutOverlay.pathname;
    urlWithoutOverlay.pathname = path.slice(0, path.lastIndexOf('/'));
    urlWithoutOverlay.searchParams.delete('scan');
    urlWithoutOverlay.searchParams.delete('mapMode');
    historyRef.current.replace(
      `${urlWithoutOverlay.pathname}${urlWithoutOverlay.search}`,
    );
  }, [historyRef]);

  const handleNetworkTestClose = React.useCallback(() => {
    setMapMode(MAPMODE.DEFAULT);
    updateNetworkMapOptions({
      temporaryTopology: null,
      temporarySelectedAsset: null,
      scanLinkData: null,
    });
    onClose();
  }, [onClose, updateNetworkMapOptions, setMapMode]);

  if (!scanId) {
    return null;
  }

  return (
    <CustomAccordion
      title="Scan Service"
      expanded={expanded}
      onClose={handleNetworkTestClose}
      details={<ScanServiceSummary scanId={scanId} />}
    />
  );
});
