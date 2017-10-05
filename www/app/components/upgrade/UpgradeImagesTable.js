import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

import { Actions } from '../../NetworkConstants.js';
import Dispatcher from '../../NetworkDispatcher.js';

export default class UpgradeImagesTable extends React.Component {

  constructor(props) {
    super(props);
    this.getTableRows = this.getTableRows.bind(this);
  }

  onSelectAll = (isSelected) => {
    const images = this.props.images;
    const imagesSelected = (isSelected) ? images.map(image => image.name) : [];

    this.props.onImagesSelected(imagesSelected);
  }

  tableOnRowSelect = (row, isSelected) => {
    let imagesSelected = [];
    if (isSelected) {
      imagesSelected = [...this.props.imagesSelected, row.name];
    } else {
      imagesSelected = this.props.imagesSelected.filter((image) => image !== row.name);
    }

    this.props.onImagesSelected(imagesSelected);
  }

  getTableRows(): Array<{name:string,
                         magnetUri:string}>  {
    const rows = [];
    this.props.images.forEach(image => {
      rows.push({
        name: image.name,
        magnetUri: image.magnetUri,

        key: image.name,
      });
    });
    return rows;
  }


  // TODO: move selected to props!
  render() {
    var selectRowProp = {
      mode: "checkbox",
      clickToSelect: true,
      hideSelectColumn: false,
      bgColor: "rgb(183,210,255)",
      onSelect: this.tableOnRowSelect,
      selected: this.props.imagesSelected,
      onSelectAll: this.onSelectAll,
    };

    const tableOptions = {
      trClassName: 'break-word',
    };

    return (
      <div className='rc-upgrade-images-table'>
        <BootstrapTable
            tableStyle={{
              width: 'calc(100% - 20px)',
              maxHeight: '400px',
              overflowY: 'auto',
            }}
            key="nodesTable"
            options={ tableOptions }
            data={this.getTableRows()}
            striped={true} hover={true}
            selectRow={selectRowProp}
            trClassName= 'break-word'>
          <TableHeaderColumn width="300" dataSort={false} dataField="name" isKey={ true }>
            Name
          </TableHeaderColumn>
          <TableHeaderColumn width="400"
                             dataSort={false}
                             dataField="magnetUri">
            Magnet URI
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}


// image is a list of objects with the following fields:
/*
{
  name: 'some string',
  magnetUri: 'magnets, how do they work'
}
*/
UpgradeImagesTable.propTypes = {
  images: React.PropTypes.array.isRequired,
  selectedImages: React.PropTypes.array.isRequired,
  onImagesSelected: React.PropTypes.func,
};

UpgradeImagesTable.defaultProps = {
  onImagesSelected: (() => {})
};
