/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import {diffJson} from 'diff';
import PropTypes from 'prop-types';
import React from 'react';
import cx from 'classnames';

// JSONDiff will show an alert with a diff between the draft config and config objects
const propTypes = {
  oldConfig: PropTypes.object.isRequired,
  newConfig: PropTypes.object.isRequired,
};

function JSONDiff({oldConfig, newConfig}) {
  const jsonDiff = diffJson(oldConfig, newConfig);

  const changes = jsonDiff.map((change, index) => {
    const className = cx({
      add: Boolean(change.added),
      remove: Boolean(change.removed),
      'json-diff': true,
    });

    return (
      <span key={`json-diff-${index}`} className={className}>
        {change.value}
      </span>
    );
  });

  return <pre className="json-diff-container">{changes}</pre>;
}

JSONDiff.propTypes = propTypes;
export default JSONDiff;
