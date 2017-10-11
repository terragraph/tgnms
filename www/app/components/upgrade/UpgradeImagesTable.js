import React from 'react';
import { render } from 'react-dom';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';

const classNames = require('classnames');

class DeleteImageColumn extends React.Component {

  onClick = () => {
    const {imageName, onDelete} = this.props;
    onDelete(imageName);
  }

  render() {
    const iconClass = classNames('fa', 'fa-times', 'fa-lg');
    return (
      <i
        style={{color: '#ff4444'}}
        className={iconClass}
        onClick={this.onClick}
      />
    );
  }
}

export default class UpgradeImagesTable extends React.Component {
  constructor(props) {
    super(props);
    this.getTableRows = this.getTableRows.bind(this);
  }

  activeFormatter = (cell, row, enumObject, index) => {
    return (
      <DeleteImageColumn
        imageName={row.name}
        onDelete={this.props.onDeleteImage}
      />
    );
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

  render() {
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
            trClassName= 'break-word'>
          <TableHeaderColumn
            tdStyle={{wordWrap: 'break-word'}}
            width="400" dataSort={false} dataField="name" isKey={ true }
          >
            Name
          </TableHeaderColumn>
          <TableHeaderColumn
            tdStyle={{wordWrap: 'break-word'}}
            width="400" dataSort={false} dataField="magnetUri"
          >
            Magnet URI
          </TableHeaderColumn>
          <TableHeaderColumn
            width="45"
            tdStyle={{
              textAlign: 'center',
              verticalAlign: 'middle',
              padding: 0
            }}
            dataSort={false}
            dataField="deleteImage"
            dataFormat={this.activeFormatter}
          >
            Delete Image
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
  onDeleteImage: React.PropTypes.func.isRequired
};
