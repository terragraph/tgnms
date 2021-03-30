/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import HealthGroupDropDown from '../../common/HealthGroupDropDown';
import LinkInterference from './LinkInterference';
import NmsOptionsContext from '../../../contexts/NmsOptionsContext';
import React from 'react';
import ScanPanelTitle from './ScanPanelTitle';
import useLiveRef from '@fbcnms/tg-nms/app/hooks/useLiveRef';
import {
  HEALTH_CODES,
  HEALTH_DEFS,
} from '@fbcnms/tg-nms/app/constants/HealthConstants';
import {LinkTypeValueMap} from '../../../../shared/types/Topology';
import {
  convertType,
  objectValuesTypesafe,
} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';
import {
  locToPos,
  locationMidpoint,
} from '@fbcnms/tg-nms/app/helpers/GeoHelpers';
import {useMapContext} from '@fbcnms/tg-nms/app/contexts/MapContext';
import {useNetworkContext} from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import {useRouteContext} from '@fbcnms/tg-nms/app/contexts/RouteContext';

import type {
  AggregatedInrType,
  ExecutionResultDataType,
  InterferenceGroupType,
} from '../../../../shared/dto/ScanServiceTypes';
import type {HealthRowType} from '../../common/HealthGroupDropDown';

export const SCAN_INTERFERENCE_CUTOFFS = {
  STRONG: 0,
  WEAK: -10,
};

type Props = {
  onBack: () => void,
  results: Array<ExecutionResultDataType>,
  aggregatedInr: ?AggregatedInrType,
  startDate: Date,
};

export default function ScanInterference(props: Props) {
  const {moveMapTo} = useMapContext();
  const {
    nodeMap,
    siteMap,
    selectedElement,
    setSelected,
    removeElement,
    macToNodeMap,
    nodeToLinksMap,
    linkMap,
  } = useNetworkContext();
  const {onBack, results, aggregatedInr, startDate} = props;
  const [selectedLink, setSelectedLink] = React.useState(null);
  const topologyMaps = React.useRef({macToNodeMap, nodeToLinksMap, linkMap});
  const {updateNetworkMapOptions} = React.useContext(NmsOptionsContext);
  const routes = useRouteContext();
  const routesRef = useLiveRef(routes);
  const interferenceGroups = React.useMemo(
    () => parseInterference(results, aggregatedInr, topologyMaps),
    [results, topologyMaps, aggregatedInr],
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

      const mapLink = linkMap[link.assetName];
      const aNode = nodeMap[mapLink.a_node_name];
      const zNode = nodeMap[mapLink.z_node_name];
      const location = locationMidpoint(
        siteMap[aNode.site_name].location,
        siteMap[zNode.site_name].location,
      );
      moveMapTo({
        center: locToPos(location),
      });
    }
  };

  return (
    <>
      <ScanPanelTitle
        title="Interference"
        startDate={startDate}
        onBack={handleBack}
      />
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

function parseInterference(scanData, aggregatedInr, topologyMaps) {
  const {macToNodeMap, nodeToLinksMap, linkMap} = topologyMaps.current;

  const networkInterference = scanData.reduce((result, scanResult) => {
    const interferenceResults = scanResult.interference;

    if (scanResult.tx_node === null || !interferenceResults) {
      return result;
    }

    interferenceResults.forEach(interference => {
      //tx_node - tx_to_node is link transmitting
      //rx_from_node - rx_node is link recieving interference from tx link
      //inr_curr_power.snr_avg is the INR interference
      //  for current power measured in dB

      //get link lists from nodes
      const aNode = macToNodeMap[interference.rx_from_node];
      const zNode = macToNodeMap[interference.rx_node];
      const tempDirection = `${aNode},${zNode}`;
      const aNodeLinks = nodeToLinksMap[aNode];
      const zNodeLinks = nodeToLinksMap[zNode];

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
          [...aNodeLinks.values()].find(link => zNodeLinks.has(link)) ?? null;
        const interferenceLinkName =
          [...aInterferenceNodeLinks.values()].find(link =>
            zInterferenceNodeLinks.has(link),
          ) ?? null;

        const currentINR = interference.inr_curr_power.snr_avg ?? 0;
        const totalInrDirections = linkName
          ? aggregatedInr?.current[linkName]
          : null;

        const totalInr =
          totalInrDirections?.find(
            inrDirection =>
              inrDirection.rx_from_node === interference.rx_from_node &&
              inrDirection.rx_node === interference.rx_node,
          )?.inr_curr_power ?? 0;

        let health = HEALTH_CODES.EXCELLENT;
        if (totalInr > SCAN_INTERFERENCE_CUTOFFS.STRONG) {
          health = HEALTH_CODES.GOOD;
        } else if (totalInr > SCAN_INTERFERENCE_CUTOFFS.WEAK) {
          health = HEALTH_CODES.MARGINAL;
        }

        // if the link already has been processed,
        // add this link to the INR list otherwise add it
        const currentLink = result.find(link => link.assetName === linkName);

        if (currentLink && interferenceLinkName !== null) {
          //check if there is data for current direction
          const currentDirection = currentLink.directions.findIndex(
            direction => direction.label === tempDirection,
          );
          if (currentDirection !== -1) {
            currentLink.directions[currentDirection].interference.push({
              interferenceLinkName,
              INR: currentINR,
            });
          } else {
            currentLink.directions.push({
              label: tempDirection,
              interference: [{interferenceLinkName, INR: currentINR}],
              totalINR: totalInr,
              health,
            });
          }
        } else if (linkName !== null) {
          result.push({
            assetName: linkName,
            directions: [
              {
                label: tempDirection,
                interference: [{interferenceLinkName, INR: currentINR}],
                totalINR: totalInr,
                health,
              },
            ],
          });
        }
      }
    });
    return result;
  }, []);

  const remainingLinks = Object.keys(linkMap).filter(
    link =>
      networkInterference.find(
        interferenceLink =>
          interferenceLink.assetName === link &&
          linkMap[link].link_type === LinkTypeValueMap.WIRELESS,
      ) === undefined,
  );

  const interferenceHealthGroups = {
    strong: {
      name: 'strong',
      links: [],
      health: HEALTH_CODES.POOR,
    },
    weak: {
      name: 'weak',
      links: [],
      health: HEALTH_CODES.MARGINAL,
    },
    none: {
      name: 'no',
      links: remainingLinks.map(link => ({
        assetName: link,
        directions: [
          {interference: [], label: link, totalINR: -100, health: 0},
        ],
        totalINR: -100,
      })),
      health: HEALTH_CODES.EXCELLENT,
    },
  };
  networkInterference.forEach(linkInterference => {
    const worstTotalInr = linkInterference.directions.reduce(
      (final, direction) => {
        if (direction?.totalINR > final) {
          return direction.totalINR;
        }
        return final;
      },
      -100,
    );

    if (worstTotalInr > SCAN_INTERFERENCE_CUTOFFS.STRONG) {
      interferenceHealthGroups.strong.links.push(linkInterference);
    } else if (worstTotalInr > SCAN_INTERFERENCE_CUTOFFS.WEAK) {
      interferenceHealthGroups.weak.links.push(linkInterference);
    } else {
      interferenceHealthGroups.none.links.push(linkInterference);
    }
  });

  return interferenceHealthGroups;
}
