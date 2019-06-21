/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import CustomExpansionPanel, * as Expansion from '../../common/CustomExpansionPanel';
import {withRouter} from 'react-router-dom';
import type {Element} from '../../../NetworkContext';
import ConfigureSpeedTest from './ConfigureSpeedTest';
import SpeedTestStatus from './SpeedTestStatus';
import SpeedTestResult from './SpeedTestResult';
import RouteContext from '../../../RouteContext';
import type {ContextRouter} from 'react-router-dom';

import {
  setUrlSearchParam,
  deleteUrlSearchParam,
} from '../../../helpers/NetworkTestHelpers';

type Props = {
  selectedElement: Element,
  testId: string,
} & Expansion.Props &
  ContextRouter;

// track the state of the UI, not the test.
const SPEED_TEST_UI_STATES = {
  CONFIGURE: 0,
  INPROGRESS: 1,
  COMPLETE: 2,
};

export default withRouter(function SpeedTestPanel(props: Props) {
  const {history, expanded, testId, selectedElement} = props;
  const [testState, setTestState] = React.useState<
    $Values<typeof SPEED_TEST_UI_STATES>,
  >(SPEED_TEST_UI_STATES.CONFIGURE);
  const routeContext = React.useContext(RouteContext);
  const handleTestStarted = React.useCallback(
    testId => {
      setUrlSearchParam(history, 'speedTest', testId);
      setTestState(SPEED_TEST_UI_STATES.INPROGRESS);
    },
    [history],
  );
  const handleTestComplete = React.useCallback(
    () => setTestState(SPEED_TEST_UI_STATES.COMPLETE),
    [],
  );
  const closeSpeedTestPanel = React.useCallback(() => {
    deleteUrlSearchParam(history, 'speedTest');
    routeContext.setNodeRoutes(null);
  }, [history, routeContext]);
  React.useEffect(() => {
    if (typeof testId === 'string' && testId !== '') {
      setTestState(SPEED_TEST_UI_STATES.INPROGRESS);
    } else {
      setTestState(SPEED_TEST_UI_STATES.CONFIGURE);
    }
  }, [testId, selectedElement]);
  return (
    <CustomExpansionPanel
      title="Speed Test"
      expanded={expanded}
      onClose={closeSpeedTestPanel}
      details={(() => {
        switch (testState) {
          case SPEED_TEST_UI_STATES.INPROGRESS:
            return (
              <SpeedTestStatus
                testId={testId}
                onComplete={handleTestComplete}
              />
            );
          case SPEED_TEST_UI_STATES.COMPLETE:
            return <SpeedTestResult testId={testId} />;
          default:
            return (
              <ConfigureSpeedTest
                selectedElement={props.selectedElement}
                onTestStarted={handleTestStarted}
              />
            );
        }
      })()}
    />
  );
});
