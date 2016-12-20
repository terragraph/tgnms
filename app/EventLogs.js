import React from 'react';
// leaflet maps
import { render } from 'react-dom';
// dispatcher
import Actions from './NetworkActionConstants.js';
import Dispatcher from './NetworkDispatcher.js';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import AsyncButton from 'react-async-button';
import Dropdown from 'react-dropdown'
import NumericInput from 'react-numeric-input';

const Spinner = () => (
  <div className='spinner'>
    <div className='double-bounce1'></div>
    <div className='double-bounce2'></div>
  </div>
)

export default class EventLogs extends React.Component {
  state = {
    tables: [],
    selectedTable: null,
    selectedTableName: null,
    searchResult: [],
    from: 0,
    size: 500,
  }

  constructor(props) {
    super(props);
    this.selectChange = this.selectChange.bind(this);
    this.getConfigs = this.getConfigs.bind(this);
    this.diveClick = this.diveClick.bind(this);
    this.executeSearch = this.executeSearch.bind(this);
    this.findprop = this.findprop.bind(this);
    this.renderTableColumns = this.renderTableColumns.bind(this);
    this.renderDataTable = this.renderDataTable.bind(this);
    this.handleSizeChange = this.handleSizeChange.bind(this);
    this.handleFromChange = this.handleFromChange.bind(this);

    this.getConfigs();
  }

  getConfigs() {
    let getTables = new Request('/elastic/getTables');
    fetch(getTables).then(function(response) {
      if (response.status == 200) {
        response.json().then(function(json) {
          this.setState({
            tables: json.tables,
          });
        }.bind(this));
      }
    }.bind(this));
  }

  diveClick(e) {
    return new Promise((resolve, reject) => {
      let exec = new Request('/elastic/execute/'+ this.state.selectedTableName+'/'+this.state.from+'/'+this.state.size);
      fetch(exec).then(function(response) {
        if (response.status == 200) {
          response.json().then(function(json) {
            this.setState({
              searchResult: json,
            });
            resolve();
          }.bind(this));
        }
      }.bind(this));
    });
  }

  selectChange(val) {
    Object(this.state.tables).forEach(table => {
      if (table.name == val.value) {
        this.setState({
          selectedTable: table,
          selectedTableName: val.label,
          searchResult: [],
        });
        return;
      }
    });
  }

  findprop(obj, path): Object {
    var args=path.split('.');
    var l=args.length;

    for (var i=0;i<l;i++) {
        if (!obj.hasOwnProperty(args[i]) )
            return;
        obj=obj[ args[i] ];
    }
    return obj;
  }

  getTableRows(): Array {
    const rows = [];
    if (!this.state.selectedTable) {
      return rows;
    }

    let table = this.state.selectedTable;
    let columns = table.display.columns;

    Object(this.state.searchResult).forEach(result => {
      var row = {};
      row["_id"] = result["_id"];
      Object(columns).forEach(column => {
        var val = this.findprop(result._source, column.field);
        if (column.format) {
          switch (column.format) {
            case "TIME_MS":
              val = new Date(val).toISOString().replace(/T/, ' ').replace(/\..+/, '');
              break;
            case "TIME_S":
              val = new Date(val*1000).toISOString().replace(/T/, ' ').replace(/\..+/, '');
              break;
          }
        }
        row[column.field] = val;
      });
      rows.push(row);
    });

    return rows;
  }

  renderTableColumns(): ReactElement<any> {
    let tableColumns = [];
    tableColumns.push(
      <TableHeaderColumn
        key="keyColumn"
        isKey={ true }
        hidden
        dataField="_id">
      </TableHeaderColumn>
    );

    if (this.state.selectedTable && this.state.tables) {
      let table = this.state.selectedTable;
      let columns = table.display.columns;
      Object(columns).forEach(column => {
        tableColumns.push(
          <TableHeaderColumn
            key={column.field}
            dataSort={true}
            filter={ { type: 'TextFilter', delay: 1000 } }
            width={column.width? column.width : ""}
            dataField={column.field}>
          {column.label}
          </TableHeaderColumn>
        );
      });
    }
    return tableColumns;
  }

  renderDataTable(): ReactElement<any> {
    const options = {
        sizePerPageList: [{text: '50', value: 50},
                          {text: '100', value: 100},
                          {text: '500', value: 500}],
        sizePerPage: 50,
        };
    if (this.state.selectedTable && this.state.tables) {
      return (
        <BootstrapTable
            pagination
            options={options}
            data={this.getTableRows()}>
          {this.renderTableColumns()}
        </BootstrapTable>
      );
    } else {
      return (<div></div>);
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

  render() {
    var options = [];
    if (this.state.tables) {
      Object(this.state.tables).forEach(table => {
        options.push(
          {
            value: table.name,
            label: table.name
          },
        );
      });
    }

    return (
      <div>
        <table id="events">
         <tbody>
          <tr>
            <td width={330}>
              <div style={{width:300}}>
                <Dropdown
                  options={options}
                  placeholder = "Select Table"
                  value={this.state.selectedTableName}
                  onChange={this.selectChange}/>
              </div>
            </td>
            <td>
              From:
            </td>
            <td width={80}>
              <NumericInput
                className="form-control"
                style={ false }
                value={this.state.from}
                onChange={this.handleFromChange} />
            </td>
            <td>
              Size:
            </td>
            <td width={80}>
              <NumericInput
                className="form-control"
                style={ false }
                value={this.state.size}
                onChange={this.handleSizeChange} />
            </td>
            <td>
              <AsyncButton
                className="btn btn-primary"
                text='Dive!'
                pendingText='Searching...'
                fulFilledText='Dive!'
                onClick={this.diveClick}>
                {
                  ({ buttonText, isPending }) => (
                    <span>
                      { isPending && <Spinner />}
                      <span>{buttonText}</span>
                    </span>
                  )
                }
              </AsyncButton>
            </td>
          </tr>
         </tbody>
        </table>
        <div>
          {this.renderDataTable()}
        </div>
      </div>
    );
  }
}
