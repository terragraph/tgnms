/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import axios from 'axios';
import moment from 'moment';
import PropTypes from 'prop-types';
import AsyncButton from 'react-async-button';
// dispatcher
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import DatePicker from 'react-datepicker';
import NumericInput from 'react-numeric-input';
import Select from 'react-select';
import React from 'react';

const Spinner = () => (
  <div className="spinner">
    <div className="double-bounce1" />
    <div className="double-bounce2" />
  </div>
);

export default class EventLogs extends React.Component {
  state = {
    tables: [],
    selectedTable: null,
    selectedTableName: null,
    searchResult: [],
    from: 0,
    size: 500,
    dateFrom: moment(),
  };

  constructor(props) {
    super(props);
    this.selectChange = this.selectChange.bind(this);
    this.getConfigs = this.getConfigs.bind(this);
    this.diveClick = this.diveClick.bind(this);
    this.findprop = this.findprop.bind(this);
    this.renderTableColumns = this.renderTableColumns.bind(this);
    this.renderDataTable = this.renderDataTable.bind(this);
    this.handleSizeChange = this.handleSizeChange.bind(this);
    this.handleFromChange = this.handleFromChange.bind(this);
    this.handleDateChange = this.handleDateChange.bind(this);

    this.getConfigs();
  }

  getConfigs() {
    axios.get('/getEventLogsTables').then(response => {
      this.setState({tables: response.data.tables});
    });
  }

  async diveClick(e) {
    const {dateFrom, from, selectedTableName, size} = this.state;
    const {networkName} = this.props;
    const formattedDate = dateFrom.format('YYYY_MM_DD');
    const url = `/getEventLogs/${selectedTableName}/${from}/${size}/${networkName}/d_${formattedDate}`;
    const response = await axios.get(url);
    this.setState({searchResult: response.data});
  }

  selectChange(val) {
    Object(this.state.tables).forEach(table => {
      if (table.name === val.value) {
        this.setState({
          selectedTable: table,
          selectedTableName: val.label,
          searchResult: [],
        });
        return;
      }
    });
  }

  findprop(obj, path) {
    var args = path.split('.');
    var l = args.length;

    for (var i = 0; i < l; i++) {
      if (!obj.hasOwnProperty(args[i])) {
        return;
      }
      obj = obj[args[i]];
    }
    return obj;
  }

  getTableRows(): Array {
    const rows = [];
    if (!this.state.selectedTable) {
      return rows;
    }

    const table = this.state.selectedTable;
    const columns = table.display.columns;
    var id = 0;
    Object(this.state.searchResult).forEach(result => {
      var row = {};
      var tzoffset = new Date().getTimezoneOffset() * 60000;

      row._id = id++;
      Object(columns).forEach(column => {
        var val = this.findprop(result, column.field);
        if (column.format) {
          switch (column.format) {
            case 'TIME_MS':
              val = new Date(val - tzoffset)
                .toISOString()
                .replace(/T/, ' ')
                .replace(/\..+/, '');
              break;
            case 'TIME_S':
              val = new Date(val * 1000 - tzoffset)
                .toISOString()
                .replace(/T/, ' ')
                .replace(/\..+/, '');
              break;
          }
        }
        row[column.field] = val;
      });
      rows.push(row);
    });

    return rows;
  }

  renderTableColumns(): React.Element<any> {
    const tableColumns = [];
    tableColumns.push(
      <TableHeaderColumn key="keyColumn" isKey={true} hidden dataField="_id" />,
    );

    if (this.state.selectedTable && this.state.tables) {
      const table = this.state.selectedTable;
      const columns = table.display.columns;
      Object(columns).forEach(column => {
        tableColumns.push(
          <TableHeaderColumn
            key={column.field}
            dataSort={true}
            filter={{type: 'TextFilter', delay: 1000}}
            width={column.width ? column.width : ''}
            dataField={column.field}>
            {column.label}
          </TableHeaderColumn>,
        );
      });
    }
    return tableColumns;
  }

  renderDataTable(): React.Element<any> {
    const options = {
      sizePerPageList: [
        {text: '50', value: 50},
        {text: '100', value: 100},
        {text: '500', value: 500},
      ],
      sizePerPage: 50,
    };
    if (this.state.selectedTable && this.state.tables) {
      return (
        <BootstrapTable pagination options={options} data={this.getTableRows()}>
          {this.renderTableColumns()}
        </BootstrapTable>
      );
    } else {
      return <div />;
    }
  }

  handleFromChange(val) {
    this.setState({
      from: val,
    });
  }
  handleSizeChange(val) {
    this.setState({
      size: val,
    });
  }

  handleDateChange(date) {
    this.setState({
      dateFrom: date,
    });
  }

  render() {
    var options = [];
    if (this.state.tables) {
      Object(this.state.tables).forEach(table => {
        options.push({
          value: table.name,
          label: table.name,
        });
      });
    }

    return (
      <div style={{width: '100%', float: 'left'}}>
        <table style={{borderCollapse: 'separate', borderSpacing: '15px 5px'}}>
          <tbody>
            <tr>
              <td width={330}>
                <div style={{width: 300}}>
                  <Select
                    options={options}
                    name="Select Table"
                    value={this.state.selectedTableName}
                    onChange={this.selectChange}
                    clearable={false}
                  />
                </div>
              </td>
              <td>Date:</td>
              <td>
                <DatePicker
                  selected={this.state.dateFrom}
                  onChange={this.handleDateChange}
                />
              </td>
              <td>From:</td>
              <td width={80}>
                <NumericInput
                  className="form-control"
                  style={false}
                  value={this.state.from}
                  onChange={this.handleFromChange}
                />
              </td>
              <td>Size:</td>
              <td width={80}>
                <NumericInput
                  className="form-control"
                  style={false}
                  value={this.state.size}
                  onChange={this.handleSizeChange}
                />
              </td>
              <td>
                <AsyncButton
                  className="btn btn-primary"
                  text="Dive!"
                  pendingText="Searching..."
                  fulFilledText="Dive!"
                  fulFilledClass="btn-success"
                  rejectedText="Dive!"
                  rejectedClass="btn-danger"
                  onClick={this.diveClick}>
                  {({buttonText, isPending}) => (
                    <span>
                      {isPending && <Spinner />}
                      <span>{buttonText}</span>
                    </span>
                  )}
                </AsyncButton>
              </td>
            </tr>
          </tbody>
        </table>
        <div>{this.renderDataTable()}</div>
      </div>
    );
  }
}
EventLogs.propTypes = {
  networkName: PropTypes.string.isRequired,
  networkConfig: PropTypes.object.isRequired,
};
