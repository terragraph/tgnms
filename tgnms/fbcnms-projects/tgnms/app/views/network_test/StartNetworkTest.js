/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import type {WithStyles} from '@material-ui/core/styles';
import type {UINotification} from '../../components/common/CustomSnackbar';

import React from 'react';

import Button from '@material-ui/core/Button';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import {withStyles} from '@material-ui/core/styles';
import {makeStyles} from '@material-ui/styles';
import MaterialModal from '../../components/common/MaterialModal';
import LoadingBox from '../../components/common/LoadingBox';
import NetworkTestParameterFactory from './NetworkTestParameterFactory';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';

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

type Props = {
  loadTestExecutions: () => any,
  showNotification: UINotification => any,
  onTestStarted?: () => any,
  onTestStartFailed?: () => any,
  className: string,
  networkName: string,
  /**
   * set this to false if you're using this inside a modal
   */
  stopTestTimerOnUnmount?: boolean,
};

type State = {|
  // the list of test types and their parameters
  networkTestSchema: ?testApi.StartNetworkTestSchema,
  // a reference to the selected test definition for easier parameter lookups
  selectedTest: ?testApi.NetworkTestDefinition,
  formData: testApi.StartNetworkTestFormData,
  loadingFailed: boolean,
|};

const StartNetworkTest = withStyles(styles)(
  class StartNetworkTest extends React.PureComponent<
    Props & WithStyles,
    State,
  > {
    static defaultProps = {
      className: '',
      onTestStarted: () => {},
      onTestStartFailed: () => {},
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
                this.state.selectedTest.parameters
                  .filter(hideTopologyId)
                  .map(param => (
                    <NetworkTestParameterFactory
                      key={param.label}
                      parameter={param}
                      value={this.getArgumentValue(param.id)}
                      onChange={this.handleArgumentChange}
                    />
                  ))}
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
      this.startTest();
    };

    startTest = () => {
      const {formData} = this.state;

      return testApi
        .startTest(formData)
        .then(response => {
          if (response.data && response.data.error === true) {
            return this.startTestFailed(
              (response.data && response.data.msg) || 'Starting test failed',
            );
          }
          setTimeout(this.loadTestExecutions, 1000);
          this.props.onTestStarted && this.props.onTestStarted();
          this.props.showNotification({
            message: 'Test started',
          });
        })
        .catch(_err => {
          return this.startTestFailed('Starting test failed');
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

    startTestFailed = message => {
      this.props.showNotification({
        message: message,
        variant: 'error',
        onRetry: this.startTest,
      });
      this.props.onTestStartFailed && this.props.onTestStartFailed();
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

export function StartNetworkTestModal(props: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const startTestRef = React.useRef();
  const classes = useModalStyles();
  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outlined">
        Start Network Test
      </Button>
      <MaterialModal
        className={classes.root}
        open={isOpen}
        onClose={() => setIsOpen(false)}
        modalContent={
          <StartNetworkTest
            {...props}
            innerRef={startTestRef}
            onTestStarted={() => setIsOpen(false)}
            onTestStartFailed={() => setIsOpen(false)}
            stopTestTimerOnUnmount={false}
          />
        }
        modalTitle="Start Network Test"
        modalActions={
          <>
            <Button
              className={classes.button}
              onClick={() =>
                startTestRef.current && startTestRef.current.startTest()
              }
              variant="outlined">
              Start Test
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

function hideTopologyId(param) {
  return param.id !== 'topology_id';
}

export default StartNetworkTest;
