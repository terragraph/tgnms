/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * Shared styles for expansion pabels across docker components.
 */
import TableCell from '@material-ui/core/TableCell';
import {withStyles} from '@material-ui/core/styles';

export const styles = theme => ({
  button: {
    margin: theme.spacing.unit,
  },
  heading: {
    fontSize: 20,
  },
  root: {
    marginTop: theme.spacing.unit,
    overflowX: 'hidden',
    width: '100%',
  },
  row: {
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.background.default,
    },
  },
  table: {
    border: '1px solid rgba(224, 224, 224, 1)',
    minWidth: 700,
  },
});

export const CustomTableCell = withStyles(theme => ({
  body: {
    fontSize: 12,
  },
  head: {
    fontSize: 16,
  },
  root: {
    padding: '0px 0px 0px 10px',
  },
}))(TableCell);
