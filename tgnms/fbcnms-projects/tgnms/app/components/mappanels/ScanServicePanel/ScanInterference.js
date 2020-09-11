/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import HealthGroupDropDown from '../../common/HealthGroupDropDown';
import IconButton from '@material-ui/core/IconButton';
import LinkInterference from './LinkInterference';
import NetworkContext from '../../../contexts/NetworkContext';
import NmsOptionsContext from '../../../contexts/NmsOptionsContext';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import useLiveRef from '../../../hooks/useLiveRef';
import {HEALTH_DEFS} from '../../../constants/HealthConstants';
import {
  convertType,
  objectValuesTypesafe,
} from '../../../helpers/ObjectHelpers';
import {useRouteContext} from '../../../contexts/RouteContext';

import type {
  ExecutionResultDataType,
  InterferenceGroupType,
} from '../../../../shared/dto/ScanServiceTypes';
import type {HealthRowType} from '../../common/HealthGroupDropDown';

export const SCAN_INTERFERENCE_CUTOFFS = {
  STRONG: 0,
  WEAK: -10,
};

type Props = {onBack: () => void, results: Array<ExecutionResultDataType>};

export default function ScanInterference(props: Props) {
  const {onBack, results} = props;
  const [selectedLink, setSelectedLink] = React.useState(null);
  const {
    selectedElement,
    setSelected,
    removeElement,
    macToNodeMap,
    nodeToLinksMap,
    linkMap,
  } = React.useContext(NetworkContext);
  const topologyMaps = React.useRef({macToNodeMap, nodeToLinksMap, linkMap});
  const {updateNetworkMapOptions} = React.useContext(NmsOptionsContext);
  const routes = useRouteContext();
  const routesRef = useLiveRef(routes);

  const interferenceGroups = React.useMemo(
    () => parseInterference(results, topologyMaps),
    [results, topologyMaps],
  );

  React.useEffect(() => {
    if (selectedElement) {
      let selectedLink = null;
      Object.keys(interferenceGroups).forEach(key => {
        const groupLink = interferenceGroups[key].links.find(
          link => link.assetName === selectedElement.name,
        );
        if (groupLink != undefined) {
          selectedLink = groupLink;
        }
      });
      setSelectedLink(selectedLink);
    }
  }, [interferenceGroups, selectedElement]);

  const mapScanResults = React.useMemo(() => {
    if (!interferenceGroups) {
      return;
    }
    const finalResults = {};

    Object.keys(interferenceGroups).forEach(key => {
      const {health, links} = interferenceGroups[key];
      links.forEach(
        link =>
          (finalResults[link.assetName] = {
            A: {health: health},
            Z: {health: health},
          }),
      );
    });

    return finalResults;
  }, [interferenceGroups]);

  React.useEffect(() => {
    updateNetworkMapOptions({
      scanLinkData: mapScanResults,
    });
  }, [mapScanResults, updateNetworkMapOptions]);

  const handleBack = React.useCallback(() => {
    if (selectedLink) {
      setSelectedLink(null);
      routesRef.current.resetRoutes();
      removeElement('link', selectedLink.assetName);
    } else {
      onBack();
    }
  }, [selectedLink, onBack, setSelectedLink, removeElement, routesRef]);

  const handleRowSelect = row => {
    const link = objectValuesTypesafe<InterferenceGroupType>(
      interferenceGroups,
    ).reduce((final, group) => {
      if (final != null) {
        return final;
      }
      return group.links.find(link => link.assetName === row.asset_name);
    }, null);
    if (link != undefined) {
      setSelectedLink(link);
      setSelected('link', link.assetName);
    }
  };

  return (
    <>
      <Typography variant="body1">
        <IconButton
          size="small"
          data-testid="back-button"
          onClick={handleBack}
          color="secondary">
          <ChevronLeftIcon />
        </IconButton>
        Interference
      </Typography>
      {selectedLink ? (
        <LinkInterference linkInterference={selectedLink} />
      ) : (
        objectValuesTypesafe<InterferenceGroupType>(
          interferenceGroups,
        ).map(interferenceGroup =>
          interferenceGroup.links.length ? (
            <HealthGroupDropDown
              key={HEALTH_DEFS[interferenceGroup.health].name}
              executions={convertType<Array<HealthRowType>>(
                interferenceGroup.links,
              )}
              onRowSelect={handleRowSelect}
              dropDownText={`${interferenceGroup.links.length} links with ${interferenceGroup.name} interference`}
              health={interferenceGroup.health}
            />
          ) : null,
        )
      )}
    </>
  );
}

function parseInterference(scanData, topologyMaps) {
  const {macToNodeMap, nodeToLinksMap, linkMap} = topologyMaps.current;

  const networkInterference = scanData.reduce((result, scanResult) => {
    const interferenceResults = scanResult.interference;

    if (scanResult.tx_node === null || !interferenceResults) {
      return result;
    }

    interferenceResults.forEach(interference => {
      //tx_node - tx_to_node is link transmitting
      //rx_from_node - rx_node is link recieving interference from tx link
      //inr_curr_power.snr_est is the INR interference
      //  for current power measured in dB

      //get link lists from nodes
      const aNodeLinks =
        nodeToLinksMap[macToNodeMap[interference.rx_from_node]];
      const zNodeLinks = nodeToLinksMap[macToNodeMap[interference.rx_node]];

      const aInterferenceNodeLinks =
        nodeToLinksMap[macToNodeMap[interference.tx_node]];
      const zInterferenceNodeLinks =
        nodeToLinksMap[macToNodeMap[interference.tx_to_node]];

      if (
        aNodeLinks &&
        zNodeLinks &&
        aInterferenceNodeLinks &&
        zInterferenceNodeLinks
      ) {
        // find the link that both nodes are on
        const linkName =
          [...aNodeLinks.values()].find(link => zNodeLinks.has(link)) ?? '';
        const interferenceLinkName =
          [...aInterferenceNodeLinks.values()].find(link =>
            zInterferenceNodeLinks.has(link),
          ) ?? '';

        const currentINR = interference.inr_curr_power.snr_est ?? 0;

        // if the link already has been processed,
        // add this link to the INR list otherwise add it
        const currentLink = result.find(link => link.assetName === linkName);
        if (currentLink) {
          currentLink.interference.push({
            interferenceLinkName,
            INR: currentINR,
          });
          currentLink.totalINR += currentINR;
        } else {
          result.push({
            assetName: linkName,
            interference: [{interferenceLinkName, INR: currentINR}],
            totalINR: currentINR,
          });
        }
      }
    });
    return result;
  }, []);

  const remainingLinks = Object.keys(linkMap).filter(
    link =>
      networkInterference.find(
        interferenceLink => interferenceLink.assetName === link,
      ) === undefined,
  );

  const interferenceHealthGroups = {
    strong: {
      name: 'strong',
      links: [],
      health: 3,
    },
    weak: {
      name: 'weak',
      links: [],
      health: 2,
    },
    none: {
      name: 'no',
      links: remainingLinks.map(link => ({
        assetName: link,
        interference: [],
        totalINR: -100,
        health: 0,
      })),
      health: 0,
    },
  };
  networkInterference.forEach(linkInterference => {
    if (linkInterference.totalINR > SCAN_INTERFERENCE_CUTOFFS.STRONG) {
      interferenceHealthGroups.strong.links.push({
        ...linkInterference,
        health: 1,
      });
    } else if (linkInterference.totalINR > SCAN_INTERFERENCE_CUTOFFS.WEAK) {
      interferenceHealthGroups.weak.links.push({
        ...linkInterference,
        health: 2,
      });
    } else {
      interferenceHealthGroups.none.links.push({
        ...linkInterference,
        health: 0,
      });
    }
  });

  return interferenceHealthGroups;
}
