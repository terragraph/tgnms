/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import CustomAccordion from '../../common/CustomAccordion';
import TestExecutionSummary from './TestExecutionSummary';
import {MAPMODE, useMapContext} from '../../../contexts/MapContext';
import {withRouter} from 'react-router-dom';

import type {ContextRouter} from 'react-router-dom';

type Props = {
  testId: ?string,
  expanded: boolean,
} & ContextRouter;

export default withRouter(function NetworkTestPanel(props: Props) {
  const {expanded, testId, history} = props;
  const {setMapMode} = useMapContext();

  const onClose = React.useCallback(() => {
    const urlWithoutOverlay = new URL(window.location);
    const path = urlWithoutOverlay.pathname;
    urlWithoutOverlay.pathname = path.slice(0, path.lastIndexOf('/'));
    urlWithoutOverlay.searchParams.delete('test');
    urlWithoutOverlay.searchParams.delete('mapMode');
    history.replace(`${urlWithoutOverlay.pathname}${urlWithoutOverlay.search}`);
  }, [history]);

  const handleNetworkTestClose = React.useCallback(() => {
    setMapMode(MAPMODE.DEFAULT);
    onClose();
  }, [onClose, setMapMode]);

  if (!testId) {
    return null;
  }

  return (
    <CustomAccordion
      title="Network Test"
      expanded={expanded}
      onClose={handleNetworkTestClose}
      details={<TestExecutionSummary testId={testId} />}
    />
  );
});
