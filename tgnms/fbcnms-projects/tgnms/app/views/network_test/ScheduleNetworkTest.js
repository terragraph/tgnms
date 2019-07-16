/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import type {UINotification} from '../../components/common/CustomSnackbar';
import type {WithStyles} from '@material-ui/core/styles';

import React from 'react';

import * as testApi from '../../apiutils/NetworkTestAPIUtil';
import Button from '@material-ui/core/Button';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import LoadingBox from '../../components/common/LoadingBox';
import MaterialModal from '../../components/common/MaterialModal';
import MenuItem from '@material-ui/core/MenuItem';
import NetworkTestParameterFactory from './NetworkTestParameterFactory';
import Select from '@material-ui/core/Select';
import {makeStyles} from '@material-ui/styles';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    flexDirection: 'column',
    display: 'flex',
    paddingTop: theme.spacing.unit * 2,
  },
  testSelectField: {
    display: 'block',
    margin: '0 auto',
    marginBottom: theme.spacing.unit * 3,
  },
  testSelect: {
    minWidth: 300,
  },
});

// these params need to be hidden if start asap is true
const scheduleParams = new Set([
  'cron_minute',
  'cron_hour',
  'cron_day_of_month',
  'cron_month',
  'cron_day_of_week',
  'priority',
]);

type Props = {
  loadTestExecutions: () => any,
  showNotification: UINotification => any,
  onTestScheduled?: () => any,
  onTestScheduleFailed?: () => any,
  className: string,
  networkName: string,
  /**
   * set this to false if you're using this inside a modal
   */
  stopTestTimerOnUnmount?: boolean,
};

type State = {|
  // the list of test types and their parameters
  networkTestSchema: ?testApi.ScheduleNetworkTestSchema,
  // a reference to the selected test definition for easier parameter lookups
  selectedTest: ?testApi.NetworkTestDefinition,
  formData: testApi.ScheduleNetworkTestFormData,
  loadingFailed: boolean,
|};

const ScheduleNetworkTest = withStyles(styles)(
  class ScheduleNetworkTest extends React.PureComponent<
    Props & WithStyles,
    State,
  > {
    static defaultProps = {
      className: '',
      onTestScheduled: () => {},
      onTestScheduleFailed: () => {},
      stopTestTimerOnUnmount: true,
    };

    state = {
      networkTestSchema: null,
      selectedTest: null,
      formData: {
        testType: '8.2', // fixes a weird bug with material-ui
        arguments: {},
      },
      loadingFailed: false,
    };

    resultsTableRef = React.createRef();
    runningTestTimer = null;

    componentDidMount() {
      this.loadTestOptions();
    }

    componentWillUnmount() {
      if (
        this.runningTestTimer !== null &&
        this.props.stopTestTimerOnUnmount !== false
      ) {
        clearTimeout(this.runningTestTimer);
      }
    }

    render() {
      const {classes} = this.props;
      return (
        <form
          className={classes.root}
          autoComplete="off"
          onSubmit={this.handleFormSubmit}>
          {this.state.networkTestSchema === null &&
            !this.state.loadingFailed && <LoadingBox fullScreen={false} />}
          {this.state.networkTestSchema != null ? (
            <>
              <FormControl className={classes.testSelectField}>
                <InputLabel htmlFor="testType">Test Type</InputLabel>
                <Select
                  className={classes.testSelect}
                  name="testType"
                  id="testType"
                  value={this.state.formData.testType}
                  onChange={this.onSelectedTestTypeChange}>
                  {this.state.networkTestSchema.test_types.map(testType => (
                    <MenuItem key={testType.value} value={testType.value}>
                      {testType.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {this.state.selectedTest &&
                this.state.selectedTest.parameters.map(param => {
                  // this is implicit
                  if (param.id === 'topology_id') {
                    return null;
                  }
                  // don't show schedule related params if not scheduling
                  if (
                    runTestAsap(this.state.formData) &&
                    scheduleParams.has(param.id)
                  ) {
                    return null;
                  }
                  return (
                    <NetworkTestParameterFactory
                      key={param.label}
                      parameter={param}
                      value={this.getArgumentValue(param.id)}
                      onChange={this.handleArgumentChange}
                    />
                  );
                })}
            </>
          ) : null}
        </form>
      );
    }

    // queries the backend for the different types of tests and their parameters
    loadTestOptions = () => {
      this.setState({loadingFailed: false});
      return testApi
        .getTestOptions()
        .then(tests => {
          this.setState(
            {
              networkTestSchema: tests,
            },
            () => {
              this.selectTestType(tests.test_types[0].value || '');
            },
          );
        })
        .catch(_error => {
          this.props.showNotification({
            message: 'Could not load test options',
            onRetry: this.loadTestOptions,
            variant: 'error',
          });
          this.setState({
            loadingFailed: true,
          });
        });
    };

    onSelectedTestTypeChange = (e: SyntheticInputEvent<HTMLSelectElement>) => {
      const testTypeId = e.target.value;
      this.selectTestType(testTypeId);
    };

    selectTestType = (testTypeId: string) => {
      const testType =
        this.state.networkTestSchema &&
        this.state.networkTestSchema.test_types.find(
          type => type.value === testTypeId,
        );
      if (testType != null) {
        /*
         * initialize the arguments object with
         * the default values from the parameters
         */
        const defaultArgumentValues = testType.parameters.reduce(
          (
            args: {[string]: testApi.NetworkTestArgument},
            param: testApi.NetworkTestParameter,
          ) => {
            args[param.id] = {
              id: param.id,
              value: param.value,
            };
            return args;
          },
          {},
        );

        //set network to test
        const networkName = this.props.networkName;
        if (networkName) {
          const topologyParam = testType.parameters.find(
            x => x.id === 'topology_id',
          );
          if (topologyParam) {
            const matchingTopology =
              topologyParam.meta &&
              topologyParam.meta.dropdown &&
              topologyParam.meta.dropdown.find(
                top => top.label.toLowerCase() === networkName.toLowerCase(),
              );
            if (matchingTopology) {
              defaultArgumentValues['topology_id'].value =
                matchingTopology.value;
            }
          }
        }

        this.setState({
          selectedTest: testType,
          formData: {
            testType: testTypeId,
            arguments: defaultArgumentValues,
          },
        });
      }
    };

    handleFormSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      this.scheduleTest();
    };

    scheduleTest = () => {
      const {formData} = this.state;

      return testApi
        .startTest(formData)
        .then(response => {
          if (response.data && response.data.error === true) {
            return this.scheduleTestFailed(
              (response.data && response.data.msg) || 'Scheduling test failed',
            );
          }
          setTimeout(this.loadTestExecutions, 1000);
          this.props.onTestScheduled && this.props.onTestScheduled();
          this.props.showNotification({
            message: runTestAsap(formData) ? 'Test started' : 'Test scheduled',
          });
        })
        .catch(_err => {
          return this.scheduleTestFailed('Scheduling test failed');
        });
    };

    getArgumentValue = (parameterId: string) => {
      const param = this.state.formData.arguments[parameterId];
      return (param && param.value) || '';
    };

    handleArgumentChange = (arg: testApi.NetworkTestArgument) => {
      this.setState({
        formData: {
          testType: this.state.formData.testType,
          arguments: Object.assign({}, this.state.formData.arguments, {
            [arg.id]: arg,
          }),
        },
      });
    };

    scheduleTestFailed = message => {
      this.props.showNotification({
        message: message,
        variant: 'error',
        onRetry: this.scheduleTest,
      });
      this.props.onTestScheduleFailed && this.props.onTestScheduleFailed();
    };

    loadTestExecutions = () => {
      this.props.loadTestExecutions();
    };
  },
);

const useModalStyles = makeStyles(theme => ({
  root: {
    minWidth: 400,
  },
  button: {
    margin: theme.spacing.unit,
  },
}));

export function ScheduleNetworkTestModal(props: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const scheduleTestRef = React.useRef();
  const classes = useModalStyles();
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outlined">
        Schedule Network Test
      </Button>
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        modalContent={
          <ScheduleNetworkTest
            {...props}
            innerRef={scheduleTestRef}
            onTestScheduled={() => setIsOpen(false)}
            onTestScheduleFailed={() => setIsOpen(false)}
            stopTestTimerOnUnmount={false}
          />
        }
        modalTitle="Schedule Network Test"
        modalActions={
          <>
            <Button
              className={classes.button}
              onClick={() =>
                scheduleTestRef.current &&
                scheduleTestRef.current.scheduleTest()
              }
              variant="outlined">
              Schedule Test
            </Button>
            <Button
              className={classes.button}
              onClick={() => setIsOpen(false)}
              variant="outlined">
              Cancel
            </Button>
          </>
        }
      />
    </>
  );
}

function runTestAsap(formData: testApi.ScheduleNetworkTestFormData) {
  const startAsap = parseInt(formData.arguments['asap'].value) !== 0;
  return startAsap;
}

export default ScheduleNetworkTest;
