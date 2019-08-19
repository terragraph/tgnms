/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */

import Button from '@material-ui/core/Button';
import MaterialModal from '../../components/common/MaterialModal';
import React from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  button: {
    margin: theme.spacing(),
  },
  detailsPre: {
    padding: `${theme.spacing(2)}px ${theme.spacing(2)}px 0`,
    margin: 0,
    whiteSpace: 'pre-wrap',
    overlayWrap: 'break-word',
  },
});

type Props = {
  classes: Object,
  isOpen: boolean,
  onClose: Function,
  event: ?Object,
};

type State = {};

class ModalEventInfo extends React.Component<Props, State> {
  state = {};

  renderEventDetails = details => {
    // Render the event 'details' field
    const {classes} = this.props;

    // Try to parse and format the details as JSON
    let detailsStr = details;
    try {
      detailsStr = JSON.stringify(JSON.parse(details), null, 2);
    } catch (_err) {}

    return <pre className={classes.detailsPre}>{detailsStr}</pre>;
  };

  renderEvent = event => {
    // Render the event
    const rows = [
      ['Timestamp', new Date(event.timestamp * 1000).toLocaleString()],
      ['Name', event.name ? `${event.name} / ${event.mac}` : event.mac],
      ['Type', `${event.category || '?'} - ${event.subcategory || '?'}`],
      ['Source', event.source],
      ['Description', event.reason],
    ];

    return (
      <>
        <Table>
          <TableBody>
            {rows.map(([k, v]) => (
              <TableRow key={k}>
                <TableCell component="th" scope="row">
                  <strong>{k}</strong>
                </TableCell>
                <TableCell align="right">{v}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {event.details && event.details !== '{}'
          ? this.renderEventDetails(event.details)
          : null}
      </>
    );
  };

  render() {
    const {classes, isOpen, onClose, event} = this.props;

    return (
      <MaterialModal
        open={isOpen}
        onClose={onClose}
        modalTitle="Event Details"
        modalContent={event ? this.renderEvent(event) : null}
        modalActions={
          <Button
            className={classes.button}
            variant="outlined"
            onClick={onClose}>
            Close
          </Button>
        }
      />
    );
  }
}

export default withStyles(styles)(ModalEventInfo);
