/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
'use strict';

import type {ContextRouter} from 'react-router-dom';
import type {WithStyles} from '@material-ui/core/styles';
import type {TestExecution} from '../../../shared/dto/TestExecution';
import type {TablePage} from '../../../shared/dto/TablePage';
import type {UINotification} from '../../components/common/CustomSnackbar';
import type {CreateTestUrl} from './NetworkTest';

import * as React from 'react';
import {Link, withRouter} from 'react-router-dom';
import classNames from 'classnames';
import {withStyles} from '@material-ui/core/styles';
import {makeStyles} from '@material-ui/styles';
import CustomTable from '../../components/common/CustomTable';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Tooltip from '@material-ui/core/Tooltip';
import CheckIcon from '@material-ui/icons/Check';
import LinearProgress from '@material-ui/core/LinearProgress';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import CancelIcon from '@material-ui/icons/Cancel';
import AccessTimeIcon from '@material-ui/icons/AlarmOn';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import HelpIcon from '@material-ui/icons/Help';
import MapIcon from '@material-ui/icons/Map';
import moment from 'moment';
import LoadingBox from '../../components/common/LoadingBox';
import {createTestMapLink} from '../../helpers/NetworkTestHelpers';
import {formatNumber} from '../../helpers/StringHelpers';
import AbortNetworkTestButton from './AbortNetworkTestButton';
import TestTypeCell from './TestTypeCell';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';

import {
  TEST_STATUS,
  TEST_TYPE,
  PROTOCOL,
} from '../../../shared/dto/TestExecution';

const styles = theme => ({
  root: {
    display: 'flex',
    height: '100%',
    flexGrow: 1,
    flexFlow: 'column',
    overflow: 'hidden',
  },
  actionColumn: {
    width: 100,
  },
  testComplete: {
    cursor: 'pointer',
  },
  testSelected: {
    backgroundColor: theme.palette.grey[100],
  },
  loadingWrapper: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
});

export type Props = {|
  selectedExecutionId?: ?string,
  networkName: ?string,
  showNotification: (notification: UINotification) => any,
  createTestUrl: CreateTestUrl,
  // set to true if this is embedded in the map view
  hideMapLink?: boolean,
|};

type State = {|
  tablePage: ?TablePage<TestExecution>,
  loading: boolean,
|};

class NetworkTestExecutionsTable extends React.PureComponent<
  Props & WithStyles & ContextRouter,
  State,
> {
  state = {
    tablePage: null,
    loading: true,
  };
  testPollingTimer: TimeoutID;
  rowHeight = 60;
  headerHeight = 80;
  overscanRowCount = 10;
  columns = [
    {
      key: 'id',
      label: '#',
      width: 60,
    },
    {
      key: 'status',
      label: 'Status',
      width: 60,
      render: (_val: number, row: TestExecution) => <TestStatusCell {...row} />,
    },
    {
      key: 'type',
      label: 'Type',
      width: 180,
      render: (_val: number, row: TestExecution) => <TestTypeCell {...row} />,
    },
    {
      key: 'start_date_utc',
      label: 'Start',
      width: 190,
      render: (val: number, _row: TestExecution) =>
        new Date(val).toLocaleString(),
      sort: true,
    },
    {
      key: 'end_date_utc',
      label: 'End',
      width: 191,
      render: (val: number, row: TestExecution) => {
        const start = new Date(row.start_date_utc);
        const end = new Date(row.end_date_utc);
        return end > start && end.toLocaleString();
      },
      sort: true,
    },
    {
      key: 'protocol',
      label: 'Protcol',
      width: 100,
      sort: true,
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 150,
      render: (_val, row: TestExecution) => {
        return (
          <span>
            {row.status === TEST_STATUS.RUNNING && (
              <AbortNetworkTestButton
                runningTest={row}
                onTestAborted={this.handleTestAborted}
                networkName={this.props.networkName}
              />
            )}
            {row.status === TEST_STATUS.FINISHED && (
              <>
                <TestLink
                  title={`View Results of test #${row.id}`}
                  to={this.createResultsPanelLink(row)}>
                  <ChevronRightIcon />
                </TestLink>
                {!this.props.hideMapLink && (
                  <TestLink
                    title={`View Map of test #${row.id}`}
                    to={createTestMapLink({
                      executionId: row.id,
                      networkName: this.props.networkName,
                    })}>
                    <MapIcon />
                  </TestLink>
                )}
              </>
            )}
          </span>
        );
      },
    },
  ];

  componentDidMount() {
    this.loadTestExecutions();
  }

  componentWillUnmount() {
    clearTimeout(this.testPollingTimer);
  }

  render() {
    const {classes} = this.props;
    if (!this.state.tablePage && this.state.loading) {
      return (
        <div className={classes.loadingWrapper}>
          <LoadingBox fullScreen={false} />
        </div>
      );
    }
    return (
      <div className={classes.root}>
        <TableOptions onOptionsUpdate={this.loadTestExecutions} />
        <CustomTable
          rowHeight={this.rowHeight}
          headerHeight={this.headerHeight}
          overscanRowCount={this.overscanRowCount}
          columns={this.columns}
          data={this.state.tablePage ? this.state.tablePage.rows : []}
          onRowSelect={this.selectTest}
          trClassName={row =>
            classNames({
              [classes.testComplete]: row.status === TEST_STATUS.FINISHED,
              [classes.testSelected]:
                row.id === parseInt(this.props.selectedExecutionId),
            })
          }
        />
      </div>
    );
  }

  loadTestExecutions = (query: ?Options) => {
    this.setState({loading: true});

    if (!query) {
      query = {
        afterDate: moment()
          .subtract(30, 'days')
          .format(),
      };
    }

    /**
     * TODO: don't use network name for querying
     * currently there are 2 topology tables so this needs
     * to stay till they're combined. Renaming a network will cause
     * this to break until the tables are combined
     */
    const networkName = this.props.networkName || '';
    return testApi
      .getExecutionsByNetworkName({networkName, ...query})
      .then(tablePage => {
        this.pollForInProgressTests(tablePage.rows);
        this.setState({
          tablePage: tablePage,
          loading: false,
        });
      })
      .catch(error => {
        this.setState({
          tablePage: {
            rows: [],
            limit: 0,
            offset: 0,
            totalCount: 0,
          },
          loading: false,
        });
        const errorMessage = error.response
          ? error.response.data.message
          : error.message;
        this.props.showNotification({
          message: errorMessage,
          onRetry: this.loadTestExecutions,
          variant: 'error',
        });
      });
  };

  handleOptionsUpdate = (options: Options) => {
    this.loadTestExecutions(options);
  };

  handleTestAborted = (response: Error | empty) => {
    if (!(response instanceof Error)) {
      this.loadTestExecutions();
    }
  };

  createResultsPanelLink = (execution: TestExecution) => {
    return this.props.createTestUrl({
      executionId: execution.id.toString(),
    });
  };

  selectTest = (execution: TestExecution) => {
    if (execution.status === TEST_STATUS.FINISHED) {
      this.props.history.push(this.createResultsPanelLink(execution));
    }
  };

  pollForInProgressTests = (tests: Array<TestExecution>) => {
    const inProgress = tests.filter(
      test => test.status === TEST_STATUS.RUNNING,
    );
    if (inProgress.length > 0) {
      this.testPollingTimer = setTimeout(() => {
        // TODO: this does not use the current filter options
        this.loadTestExecutions();
      }, 5000);
    }
  };
}

type Options = {|
  afterDate: string,
  testType?: ?$Keys<typeof TEST_TYPE>,
  protocol?: $Values<typeof PROTOCOL>,
|};

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing.unit * 2,
    padding: theme.spacing.unit,
  },
  legend: {
    marginBottom: theme.spacing.unit * 2,
  },
  formControl: {
    marginRight: theme.spacing.unit,
    minWidth: 150,
  },
  testOptionSelect: {
    textTransform: 'capitalize',
  },
  testOptionItem: {
    textTransform: 'capitalize',
  },
}));

function TableOptions({
  onOptionsUpdate,
}: {
  onOptionsUpdate: (options: Options) => any,
}) {
  const classes = useStyles();
  const firstRender = React.useRef(true);
  const dateRanges = React.useMemo(() => {
    const now = moment();
    return {
      day: now.subtract(1, 'days').format(),
      month: now.subtract(30, 'days').format(),
      quarter: now.subtract(90, 'days').format(),
      year: now.subtract(1, 'year').format(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moment().dayOfYear()]); // only recompute when the day changes

  const [options, setOptions] = React.useState<Options>({
    // default to the last month
    afterDate: dateRanges.month,
    testType: null,
  });

  React.useEffect(() => {
    // only run this effect on update
    if (firstRender.current === true) {
      firstRender.current = false;
      return;
    }
    onOptionsUpdate(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const onUpdate = React.useCallback(
    e =>
      setOptions({
        ...options,
        ...{
          [e.target.name]: e.target.value,
        },
      }),
    [options],
  );

  return (
    <div className={classes.root}>
      <Typography variant="srOnly">Filters</Typography>
      <FormGroup row>
        <FormControl className={classes.formControl}>
          <InputLabel htmlFor="afterDate">Since</InputLabel>
          <Select
            value={options.afterDate}
            onChange={onUpdate}
            inputProps={{
              id: 'afterDate',
              name: 'afterDate',
            }}>
            <MenuItem value={dateRanges.day}>Last day</MenuItem>
            <MenuItem value={dateRanges.month}>Last 30 days</MenuItem>
            <MenuItem value={dateRanges.quarter}>Last 90 days</MenuItem>
            <MenuItem value={dateRanges.year}>Last Year</MenuItem>
          </Select>
        </FormControl>
        <FormControl className={classes.formControl}>
          <InputLabel htmlFor="testType">Type</InputLabel>
          <Select
            className={classes.testOptionSelect}
            value={options.testType || ''}
            onChange={onUpdate}
            inputProps={{
              id: 'testType',
              name: 'testType',
              classes: {
                selectMenu: classNames.testOptionSelect,
              },
            }}>
            <MenuItem value={''} selected>
              Any
            </MenuItem>
            {Object.keys(TEST_TYPE).map(type => (
              <MenuItem
                key={type}
                value={type}
                className={classes.testOptionItem}>
                {TEST_TYPE[type]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl className={classes.formControl}>
          <InputLabel htmlFor="protocol">Protocol</InputLabel>
          <Select
            className={classes.testOptionSelect}
            value={options.protocol || ''}
            onChange={onUpdate}
            inputProps={{
              id: 'protocol',
              name: 'protocol',
              classes: {
                selectMenu: classNames.testOptionSelect,
              },
            }}>
            <MenuItem value={''} selected>
              Any
            </MenuItem>
            {Object.keys(PROTOCOL).map(key => (
              <MenuItem
                key={PROTOCOL[key]}
                value={PROTOCOL[key]}
                className={classes.testOptionItem}>
                {PROTOCOL[key]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FormGroup>
    </div>
  );
}

function TestLink({
  children,
  to,
  title,
}: {
  children: React.Node,
  to: string | Location,
  title: string,
}) {
  const stopPropagation = React.useCallback(e => e.stopPropagation(), []);
  return (
    <Tooltip title={title} placement="top">
      <IconButton component={Link} onClick={stopPropagation} to={to}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

/**
 * Map from a status to an icon / tooltip text. RUNNING is not included here
 * because it's a special case
 */
const statusMap = {
  [TEST_STATUS.FINISHED]: {
    text: 'Finished',
    component: props => <CheckIcon color="primary" {...props} />,
  },
  [TEST_STATUS.ABORTED]: {
    text: 'Aborted',
    component: props => <CancelIcon {...props} />,
  },
  [TEST_STATUS.FAILED]: {
    text: 'Failed',
    component: props => <ErrorOutlineIcon color="error" {...props} />,
  },
  [TEST_STATUS.SCHEDULED]: {
    text: 'Scheduled',
    component: props => <AccessTimeIcon color="primary" {...props} />,
  },
  unknown: {
    text: 'Unknown status code',
    component: props => <HelpIcon {...props} />,
  },
};

const useStatusStyles = makeStyles(_theme => ({
  running: {
    width: 30,
    flexGrow: 1,
  },
}));

function TestStatusCell({
  expected_end_date_utc,
  start_date_utc,
  status,
}: TestExecution) {
  const classes = useStatusStyles();
  const percentage = useTestStatusProgress({
    expected_end_date_utc,
    start_date_utc,
    status,
  });

  if (status === TEST_STATUS.RUNNING) {
    return (
      <Tooltip
        title={`Test Running. ${formatNumber(percentage, 0)}% complete`}
        placement="top">
        <div className={classes.running}>
          <LinearProgress variant="determinate" value={percentage} />
        </div>
      </Tooltip>
    );
  }

  const {text, component} = statusMap[status]
    ? statusMap[status]
    : statusMap.unknown;
  return (
    <Tooltip title={text} placement="top">
      {React.createElement(component, {
        'aria-label': text,
      })}
    </Tooltip>
  );
}

function useTestStatusProgress({
  start_date_utc,
  expected_end_date_utc,
  status,
}: {
  start_date_utc: Date,
  expected_end_date_utc: Date,
  status: number,
}) {
  const expectedElapsedMs =
    expected_end_date_utc.getTime() - start_date_utc.getTime();
  const [percentage, setPercentage] = React.useState(0);

  React.useEffect(() => {
    let interval: ?IntervalID = null;
    if (status === TEST_STATUS.RUNNING) {
      interval = setInterval(() => {
        const timeLeft = expected_end_date_utc.getTime() - new Date().getTime();
        const pct = ((expectedElapsedMs - timeLeft) / expectedElapsedMs) * 100;
        setPercentage(Math.min(pct, 100));
        if (pct > 100) {
          clearInterval(interval);
        }
      }, 500);
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [status, expected_end_date_utc, expectedElapsedMs]);
  return percentage;
}

export default withRouter(withStyles(styles)(NetworkTestExecutionsTable));
