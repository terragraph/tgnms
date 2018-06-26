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
    topologyName: PropTypes.string.isRequired,
    activeConfig: PropTypes.string.isRequired,
    config: PropTypes.object.isRequired,
    configMetadata: PropTypes.object,
    configDirty: PropTypes.bool.isRequired,
    draftConfig: PropTypes.object.isRequired,
    newConfigFields: PropTypes.object.isRequired,
  };

  render() {
    const {
      topologyName,
      activeConfig,
      config,
      configMetadata,
      configDirty,
      draftConfig,
      newConfigFields,
    } = this.props;

    return (
      <div className="rc-config">
        <E2EConfigBody
          topologyName={topologyName}
          activeConfig={activeConfig}
          config={config}
          configMetadata={configMetadata}
          configDirty={configDirty}
          draftConfig={draftConfig}
          newConfigFields={newConfigFields}
        />
      </div>
    );
  }
}
