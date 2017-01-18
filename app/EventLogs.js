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

const conditions = [ 'must', 'must_not'];

class ListEditor extends React.Component {
  constructor(props) {
    super(props);
    this.updateData = this.updateData.bind(this);
    this.state = { selectedItem: null };
  }
  focus() {

  }
  updateData() {
    if (this.state.selectedItem) {
      this.props.onUpdate({ item: this.state.selectedItem });
    } else if (this.props.items) {
      this.props.onUpdate({ item: this.props.items[0] });
    }
  }
  selectChange(val) {
    this.setState({
      selectedItem: val.label,
    });
  }
  render() {
    return (
      <span>
        <select
         value={this.state.selectedItem}
         onChange={ (ev) => { this.setState({ selectedItem: ev.currentTarget.value }); } } >
         { this.props.items.map(keyName => (<option key={ keyName } value={ keyName }>{ keyName }</option>)) }
        </select>
        <button
          className='btn btn-info btn-xs textarea-save-btn'
          onClick={ this.updateData }>
          save
        </button>
      </span>
    );
  }
}


export default class EventLogs extends React.Component {
  state = {
    tables: [],
    selectedTable: null,
    selectedTableName: null,
    searchResult: [],
    from: 0,
    size: 500,
    filterTerms: [],
    filtersSelected: [],
  }

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
    this.filterOnRowSelect = this.filterOnRowSelect.bind(this);

    this.getConfigs();
  }

  getConfigs() {
    let getTables = new Request('/elastic/getEventLogsTables');
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
    var must = "[";
    var must_not = "[";
    if(this.state.filterTerms) {
      this.state.filterTerms.forEach( filter => {
        if (filter.condition && filter.condition.item == "must" &&
            filter.key && filter.key.item != "null" &&
            filter.value.length > 0) {
          if (must.length > 1) {
            must += ","
          }
          must += "{ \"match_phrase\" : { \"" + filter.key.item + "\" : \"" + filter.value +"\"}}";
        } else if (filter.condition && filter.condition.item == "must_not" &&
                   filter.key && filter.key.item != "null" &&
                   filter.value.length > 0) {
          if (must_not.length > 1) {
            must_not += ","
          }
          must_not += "{ \"match_phrase\" : { \"" + filter.key.item + "\" : \"" + filter.value +"\"}}";
        }
      });
    }
    must += "]";
    must_not += "]";
    return new Promise((resolve, reject) => {
      let exec = new Request('/elastic/getEventLogs/'+ this.state.selectedTableName+'/'+this.state.from+'/'+this.state.size+'/'+must+'/'+must_not);
      fetch(exec).then(function(response) {
        if (response.status == 200) {
          response.json().then(function(json) {
            this.setState({
              searchResult: json,
            });
            resolve();
          }.bind(this));
        } else {
          reject();
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

  addFilterRow () {
    let rows = this.state.filterTerms;
    var row = {
      "_id": rows.length,
      "key": null,
      "value": "",
      "condition": null,
    };
    rows.push(row);
    this.setState({
      filterTerms: rows,
    });
  }

  deleteFilterRows () {
    let rows = this.state.filterTerms;
    var newRows = [];
    var newId = 0;
    rows.forEach(row => {
      var selected = false;
      this.state.filtersSelected.forEach(id => {
        if (id == row._id) {
          selected = true;
        }
      });

      if(!selected) {
        row._id = newId;
        newId++;
        newRows.push(row);
      }
    });
    this.setState({
      filterTerms: newRows,
      filtersSelected: [],
    });
  }

  cellListFormatter(cell, row) {
    if (cell) {
      return cell.item;
    }
    return 'null';
  }

  filterOnRowSelect(row, isSelected) {
    if (isSelected) {
      this.setState({
        filtersSelected: [ ...this.state.filtersSelected, row._id ]
      });
    } else {
      this.setState({ filtersSelected: this.state.filtersSelected.filter(it => it !== row._id) });
    }
  }

  render() {
    const createListEditor = (onUpdate, props) => (<ListEditor onUpdate={ onUpdate } {...props}/>);
    const filtersCellEditProp = {
      mode: 'click',
      blurToSave: true
    };

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

    var filtersSelectRowProp = {
      mode: "checkbox",
      clickToSelect: true,
      bgColor: "rgb(150, 150, 250)",
      onSelect: this.filterOnRowSelect,
      selected: this.state.filtersSelected,
    };

    var filterKeys = [];
    if (this.state.selectedTable && this.state.tables) {
      let table = this.state.selectedTable;
      let columns = table.display.columns;
      Object(columns).forEach(column => {
        filterKeys.push(column.field);
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
                fulFilledClass="btn-success"
                rejectedText='Dive!'
                rejectedClass="btn-danger"
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
          <button onClick={this.addFilterRow.bind(this)}>Add Source Filter</button>
          <button onClick={this.deleteFilterRows.bind(this)}>Delete Filters</button>
          <div style={{width:700}}>
          <BootstrapTable
              data={ this.state.filterTerms }
              cellEdit={ filtersCellEditProp }
              selectRow={filtersSelectRowProp}>
            <TableHeaderColumn dataField='_id' hidden isKey={ true }>id</TableHeaderColumn>
            <TableHeaderColumn width="200" editable dataField='condition'
            dataFormat={ this.cellListFormatter }
            customEditor={ { getElement: createListEditor, customEditorParameters: { items: conditions } } }>Condition</TableHeaderColumn>
            <TableHeaderColumn width="200" editable dataField='key'
            dataFormat={ this.cellListFormatter }
            customEditor={ { getElement: createListEditor, customEditorParameters: { items: filterKeys } } }>Key</TableHeaderColumn>
            <TableHeaderColumn width="200" editable dataField='value'>Value</TableHeaderColumn>
          </BootstrapTable>
          </div>
        </div>
        <div>
          {this.renderDataTable()}
        </div>
      </div>
    );
  }
}
