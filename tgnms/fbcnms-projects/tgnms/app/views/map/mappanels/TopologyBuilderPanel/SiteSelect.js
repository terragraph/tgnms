/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {EMPTY_TOPOLOGY} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {LinkTypeValueMap} from '@fbcnms/tg-nms/shared/types/Topology';
import {cloneDeep} from 'lodash';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

export default function SiteSelect() {
  const networkContext = useNetworkContext();
  const {networkConfig} = networkContext;
  const networkContextRef = useLiveRef(networkContext);
  const {topology} = networkConfig;
  const {setInitialParams, setNewTopology} = useTopologyBuilderContext();
  const [siteName, setSiteName] = React.useState(null);

  const siteOptions = React.useMemo(
    () => topology.sites.map(site => ({label: site.name, value: site.name})),
    [topology],
  );

  const handleSiteSelected = React.useCallback(
    (e, value) => setSiteName(value.value),
    [],
  );

  React.useEffect(() => {
    const {
      linkMap,
      nodeMap,
      siteToNodesMap,
      nodeToLinksMap,
    } = networkContextRef.current;
    if (siteName && siteToNodesMap[siteName]) {
      const nodeNames = [...siteToNodesMap[siteName]];
      const nodes = cloneDeep(nodeNames.map(name => nodeMap[name]));
      const linkNames = nodeNames.reduce((final, name) => {
        return [...nodeToLinksMap[name], ...final];
      }, []);
      const links = cloneDeep(
        linkNames
          .map(name => linkMap[name])
          .filter(link => link.link_type === LinkTypeValueMap.WIRELESS),
      );
      setInitialParams({nodes, links});
      setNewTopology({site: {name: siteName}, nodes, links});
    } else {
      setNewTopology(EMPTY_TOPOLOGY);
    }
  }, [siteName, setInitialParams, setNewTopology, networkContextRef]);

  return (
    <Autocomplete
      options={siteOptions}
      getOptionLabel={option => option.label}
      onChange={handleSiteSelected}
      renderInput={params => (
        <TextField
          {...params}
          InputLabelProps={{shrink: true}}
          margin="dense"
          label="Site Name"
        />
      )}
    />
  );
}
