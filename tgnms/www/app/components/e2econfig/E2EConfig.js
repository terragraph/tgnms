/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

// E2EConfig.js
// top level "pure" component for rendering the a config of the given topology (either for the Controller or Aggregator)

import E2EConfigBody from './E2EConfigBody';
import PropTypes from 'prop-types';
import React from 'react';

export default class E2EConfig extends React.Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
    configMetadata: PropTypes.object,
    draftConfig: PropTypes.object.isRequired,
    newConfigFields: PropTypes.object.isRequired,
  };

  render() {
    const {config, configMetadata, draftConfig, newConfigFields} = this.props;

    return (
      <div className="rc-network-config">
        <E2EConfigBody
          config={config}
          configMetadata={configMetadata}
          draftConfig={draftConfig}
          newConfigFields={newConfigFields}
        />
      </div>
    );
  }
}
