/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import React from 'react';
import SiteForm from '@fbcnms/tg-nms/app/views/map/mappanels/TopologyBuilderPanel/SiteForm';
import SiteSelect from '@fbcnms/tg-nms/app/views/map/mappanels/TopologyBuilderPanel/SiteSelect';
import TextField from '@material-ui/core/TextField';
import {FORM_TYPE} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

export default function SiteDetails() {
  const {elementType, formType, initialParams} = useTopologyBuilderContext();
  if (elementType !== TOPOLOGY_ELEMENT.NODE) {
    return <SiteForm />;
  } else if (formType === FORM_TYPE.CREATE) {
    return <SiteSelect />;
  } else {
    return (
      <TextField
        disabled
        fullWidth
        label={initialParams.nodes[0]?.site_name ?? ''}
      />
    );
  }
}
