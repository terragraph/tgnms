/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import React from 'react';
import PropTypes from 'prop-types';

const LinkGraphInfo = ({graph}) => {
  if (graph.setup.graphType === 'link') {
    return (
      <div>
        <p>
          <strong>Direction: </strong>
          {graph.setup.graphFormData.linkDirectionSelected}
        </p>
        <p>
          <strong>Keys: </strong>
        </p>
        <ul>
          {graph.key_data.map((keyObj, index) => (
            <li key={index}>{keyObj.key}</li>
          ))}
        </ul>
      </div>
    );
  }
};

const NodeGraphInfo = ({graph}) => {
  const {graphFormData} = graph.setup;
  const nodes = graphFormData.customGraphChecked
    ? graphFormData.customData.nodes
    : graph.setup.graphFormData.nodesSelected.map(
        nodeSelected => nodeSelected.node,
      );

  if (graph.setup.graphType === 'node') {
    return (
      <div>
        <p>
          <strong>Nodes: </strong>
        </p>
        <ul>{nodes.map((node, index) => <li key={index}>{node.name}</li>)}</ul>
        <p>
          <strong>Keys: </strong>
        </p>
        <ul>
          {graph.key_data.map((keyObj, index) => (
            <li key={index}>{keyObj.key}</li>
          ))}
        </ul>
      </div>
    );
  }
};

const GraphInfo = ({graph}) => {
  const {graphFormData, graphType} = graph.setup;
  if (graphFormData && graphFormData.customGraphChecked) {
    return (
      <div className="custom-data">
        <h5>
          <strong>Custom Data </strong>
        </h5>
        {graphType === 'link' && <LinkGraphInfo graph={graph} />}
        {graphType === 'node' && <NodeGraphInfo graph={graph} />}
        {graph.startTime && (
          <p>
            <strong>Start Time: </strong>
            {graph.startTime.toString()}
          </p>
        )}
        {graph.endTime && (
          <p>
            <strong>End Time: </strong>
            {graph.endTime.toString()}
          </p>
        )}
        {graph.minAgo && (
          <p>
            <strong>Minutes Ago: </strong>
            {graph.minAgo} minutes
          </p>
        )}
      </div>
    );
  } else {
    return (
      <div>
        {graphType === 'link' && <LinkGraphInfo graph={graph} />}
        {graphType === 'node' && <NodeGraphInfo graph={graph} />}
      </div>
    );
  }
};

const GraphInformationBox = props => {
  const {graph} = props;
  return (
    <div>
      <div className="graph-info">
        <h4 className="title">{graph.name}</h4>
        <p>
          <strong>Graph Type: </strong>
          {graph.setup.graphType}
        </p>
        <GraphInfo graph={graph} />
      </div>

      <div className="button-group">
        <button
          className="graph-button edit-graph-button"
          onClick={props.onEditGraphButtonClicked}>
          Edit Graph
        </button>
        <button
          className="graph-button  edit-graph-button"
          onClick={props.onEditGraphName}>
          Edit Name
        </button>
        <button
          className="graph-button  edit-graph-button"
          onClick={props.onDeleteGraph}>
          Delete Graph
        </button>
      </div>
    </div>
  );
};

GraphInformationBox.propTypes = {
  graph: PropTypes.object.isRequired,
  onEditGraphButtonClicked: PropTypes.func.isRequired,
  onEditGraphName: PropTypes.func.isRequired,
  onDeleteGraph: PropTypes.func,
};

export default GraphInformationBox;
