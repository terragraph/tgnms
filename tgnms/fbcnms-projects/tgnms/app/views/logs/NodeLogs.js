/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import CustomSnackbar from '../../components/common/CustomSnackbar';
import InfoIcon from '@material-ui/icons/Info';
import LoadingBox from '../../components/common/LoadingBox';
import NetworkContext from '../../NetworkContext';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import axios from 'axios';
import {createReactSelectInput} from '../../helpers/FormHelpers';
import {withStyles} from '@material-ui/core/styles';
import type {UINotification} from '../../components/common/CustomSnackbar';

const styles = theme => ({
  root: {
    display: 'flex',
    flex: '1 1 auto',
    flexFlow: 'row',

    // TODO - HACK! - Figure out how to actually set the height to 100% screen
    height: 'calc(100vh - 64px)',
  },
  optionsSidebar: {
    display: 'flex',
    flexFlow: 'column',
    width: 200,
    minWidth: 200,
    padding: '6px 12px',
  },
  sidebarText: {
    fontStyle: 'italic',
    lineHeight: 1.2,
    paddingTop: theme.spacing(),
  },
  logsBody: {
    display: 'flex',
    flexFlow: 'column',
    flexGrow: 1,
    overflow: 'auto',
  },
  logs: {
    margin: theme.spacing(),
  },
  logsInfoContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  infoText: {
    color: theme.palette.grey[700],
    lineHeight: '1rem',
    display: 'flex',
    alignItems: 'center',
  },
  iconCentered: {
    verticalAlign: 'middle',
    paddingRight: theme.spacing(),
  },
});

// Maximum number of log lines to show at once (for performance reasons)
const MAX_LOG_LINES = 200;

type Props = {
  classes: Object,
  networkName: string,
};

type State = {
  notification: UINotification,
  logFiles: ?Array<string>,
  nodeLogs: ?Array<string>,
  nodeLogsLoading: boolean,
};

class NodeLogs extends React.Component<Props, State> {
  state = {
    notification: {open: false},
    logFiles: null,
    nodeLogs: null,
    nodeLogsLoading: false,
  };

  updateSnackbar(message, variant) {
    // Show a new snackbar message
    this.setState({notification: {open: true, message, variant}});
  }

  onFetchNodeLogList = macAddr => {
    // Fetch the log file names for the given node
    axios
      .post(`/nodelogs/${macAddr}`)
      .then(response => this.setState({logFiles: response.data.files}))
      .catch(err => {
        const errorText =
          err.response && err.response.data && err.response.data.msg
            ? err.response.data.msg
            : 'Unable to fetch node logs.';
        this.updateSnackbar(errorText, 'error');
      });
  };

  onStreamNodeLog = (macAddr, logFile) => {
    // Stream the given node log
    this.setState({nodeLogs: [], nodeLogsLoading: true});

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUriBase = new URL(wsProto + '//' + window.location.host);
    const wsUri = new URL(`/nodelogs/${macAddr}/${logFile}`, wsUriBase);

    const ws = new WebSocket(wsUri);
    ws.addEventListener('open', () => this.setState({nodeLogsLoading: false}));
    ws.addEventListener('message', ev => this.addLogLine(ev.data));
  };

  addLogLine = line => {
    // Append a log line, and remove old lines after crossing MAX_LOG_LINES
    const {nodeLogs} = this.state;

    nodeLogs.push(line);
    while (nodeLogs.length > MAX_LOG_LINES) {
      nodeLogs.shift();
    }
    this.setState({nodeLogs});
  };

  renderForm = networkConfig => {
    // Render the form fields
    const {topology} = networkConfig;
    const {classes} = this.props;
    const {macAddr, logFiles, nodeLogs} = this.state;

    // Create menu items
    const nodeOptions = topology.nodes
      .filter(node => node.mac_addr)
      .map(node => ({
        label: node.name,
        value: node.mac_addr,
      }));

    // Create inputs
    const inputs = [
      {
        func: createReactSelectInput,
        label: 'Node',
        value: 'macAddr',
        selectOptions: nodeOptions,
        onChange: macAddr => {
          this.setState({logFile: '', logFiles: null, nodeLogs: null});
          this.onFetchNodeLogList(macAddr);
        },
      },
      ...(macAddr && logFiles
        ? [
            {
              func: createReactSelectInput,
              label: 'Log File',
              value: 'logFile',
              selectOptions: logFiles.map(file => ({label: file, value: file})),
              onChange: file => this.onStreamNodeLog(macAddr, file),
            },
          ]
        : []),
    ];

    return (
      <>
        {inputs.map(input =>
          input.func({...input}, this.state, this.setState.bind(this)),
        )}

        {macAddr && logFiles && nodeLogs !== null ? (
          <Typography className={classes.sidebarText} variant="body2">
            Viewing the most recent 100 log lines, and streaming new lines.
          </Typography>
        ) : null}
      </>
    );
  };

  renderLogs = () => {
    // Render the logs
    const {classes} = this.props;
    const {nodeLogs, nodeLogsLoading} = this.state;

    return nodeLogsLoading ? (
      <LoadingBox />
    ) : nodeLogs !== null ? (
      <pre className={classes.logs}>{nodeLogs.join('\n') + '\n\n'}</pre>
    ) : (
      <div className={classes.logsInfoContainer}>
        <Typography className={classes.infoText} variant="body2">
          <InfoIcon classes={{root: classes.iconCentered}} />
          Select a log file to view on the left.
        </Typography>
      </div>
    );
  };

  render() {
    return (
      <NetworkContext.Consumer>
        {networkContext => this.renderContext(networkContext)}
      </NetworkContext.Consumer>
    );
  }

  renderContext = (networkContext): ?React.Element => {
    const {classes} = this.props;
    const {notification} = this.state;
    const {networkConfig} = networkContext;

    return (
      <div className={classes.root}>
        <Paper className={classes.optionsSidebar} elevation={2}>
          {this.renderForm(networkConfig)}
        </Paper>
        <Paper className={classes.logsBody} elevation={2}>
          {this.renderLogs()}
        </Paper>

        <CustomSnackbar
          {...notification}
          onClose={(_event, _reason) =>
            this.setState({notification: {...notification, open: false}})
          }
        />
      </div>
    );
  };
}

export default withStyles(styles)(NodeLogs);
