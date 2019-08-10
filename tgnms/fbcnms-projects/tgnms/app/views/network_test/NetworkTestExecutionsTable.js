/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import type {ContextRouter} from 'react-router-dom';
import type {CreateTestUrl} from './NetworkTest';
import type {TablePage} from '../../../shared/dto/TablePage';
import type {TestExecution} from '../../../shared/dto/TestExecution';
import type {UINotification} from '../../components/common/CustomSnackbar';
import type {WithStyles} from '@material-ui/core/styles';

import * as React from 'react';
import * as testApi from '../../apiutils/NetworkTestAPIUtil';
import AbortNetworkTestButton from './AbortNetworkTestButton';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import CustomTable from '../../components/common/CustomTable';
import ExportIcon from '@material-ui/icons/GetApp';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import LoadingBox from '../../components/common/LoadingBox';
import MapIcon from '@material-ui/icons/Map';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import RootRef from '@material-ui/core/RootRef';
import Select from '@material-ui/core/Select';
import TestStatus, {
  getStatusDef,
} from '../../components/network_test/TestStatus';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import moment from 'moment';
import {Link, withRouter} from 'react-router-dom';
import {
  PROTOCOL,
  TEST_STATUS,
  TEST_TYPE,
} from '../../../shared/dto/TestExecution';
import {createTestMapLink} from '../../helpers/NetworkTestHelpers';
import {makeStyles} from '@material-ui/styles';
import {withStyles} from '@material-ui/core/styles';

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
  Props & WithStyles<typeof styles> & ContextRouter,
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
      width: 190,
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
                <TestResultExport
                  rowId={row.id.toString()}
                  showNotification={this.props.showNotification}
                />
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
      test =>
        test.status === TEST_STATUS.RUNNING ||
        test.status === TEST_STATUS.QUEUED,
    );
    if (inProgress.length > 0) {
      this.testPollingTimer = setTimeout(() => {
        // TODO: this does not use the current filter options
        this.loadTestExecutions();
      }, 5000);
    }
  };
}

function TestResultExport({rowId, showNotification}): React.Node {
  const anchorRef = React.useRef(null);
  const [exportMenuToggle, setExportMenu] = React.useState(false);

  const exportTestResults = (executionId: string, exportType: string) => {
    return testApi
      .getTestResults({
        executionId,
      })
      .then(results => {
        let blob = null;
        let fileName = '';
        if (exportType === 'csv') {
          const replaceNull = (key, value) => (value === null ? '' : value);
          const fields = Object.keys(results[0]);
          let csvData = results.map(row => {
            return fields
              .map(fieldName => {
                return JSON.stringify(row[fieldName], replaceNull);
              })
              .join(',');
          });
          csvData.unshift(fields.join(','));
          csvData = csvData.join('\r\n');
          blob = new Blob([csvData], {type: 'octet/stream'});
          fileName = `network_test_results_${executionId}.csv`;
        } else if (exportType === 'json') {
          fileName = `network_test_results_${executionId}.json`;
          blob = new Blob([JSON.stringify(results)], {
            type: 'octet/stream',
          });
        }

        const anchor = document.createElement('a');
        window.document.body.appendChild(anchor);
        anchor.style.display = 'none';
        const url = window.URL.createObjectURL(blob);
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(_ => {
        showNotification({
          message: 'Unable to fetch file right now.',
          variant: 'error',
        });
      })
      .finally(_ => {
        setExportMenu(false);
      });
  };

  return (
    <>
      <RootRef rootRef={anchorRef}>
        <IconButton aria-haspopup="true" onClick={() => setExportMenu(true)}>
          <ExportIcon />
        </IconButton>
      </RootRef>
      <Menu
        keepMounted
        autoFocus={false}
        open={exportMenuToggle}
        onClose={() => setExportMenu(false)}
        anchorEl={anchorRef.current}>
        <MenuItem onClick={_ => exportTestResults(rowId, 'csv')}>CSV</MenuItem>
        <MenuItem onClick={_ => exportTestResults(rowId, 'json')}>
          JSON
        </MenuItem>
      </Menu>
    </>
  );
}

type Options = {|
  afterDate: string,
  testType?: ?$Keys<typeof TEST_TYPE>,
  protocol?: $Values<typeof PROTOCOL>,
|};

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(),
  },
  legend: {
    marginBottom: theme.spacing(2),
  },
  formControl: {
    marginRight: theme.spacing(),
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
                selectMenu: classes.testOptionSelect,
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
                selectMenu: classes.testOptionSelect,
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
  const renderLink = React.useMemo(
    () => React.forwardRef((props, ref) => <Link {...props} innerRef={ref} />),
    [],
  );
  return (
    <Tooltip title={title} placement="top">
      <IconButton component={renderLink} onClick={stopPropagation} to={to}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

const useStatusStyles = makeStyles(_theme => ({
  [TEST_STATUS.RUNNING]: {
    width: 30,
    flexGrow: 1,
  },
}));

function TestStatusCell(props: TestExecution) {
  const classes = useStatusStyles();
  const {text} = getStatusDef(props.status);
  return (
    <Tooltip title={text} placement="top">
      <TestStatus className={classes[props.status] || ''} execution={props} />
    </Tooltip>
  );
}

const useTestTypeStyles = makeStyles({
  cell: {
    textTransform: 'capitalize',
  },
});

function TestTypeCell({test_code}) {
  const classes = useTestTypeStyles();
  let testTypeText = TEST_TYPE[test_code];
  if (typeof testTypeText !== 'string') {
    testTypeText = test_code;
  }
  return (
    <span className={classes.cell} title={`Test Code: ${test_code}`}>
      {testTypeText}
    </span>
  );
}

export default withRouter(withStyles(styles)(NetworkTestExecutionsTable));
