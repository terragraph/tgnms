/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @flow
 * @format
 */

import {
  ANP_NODE_TYPE,
  ANP_STATUS_TYPE,
  SECTOR_DEFAULT,
  kmlANPStatus,
  kmlFeatureType,
  kmlSiteType,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import {
  LinkTypeValueMap,
  NodeTypeValueMap,
} from '@fbcnms/tg-nms/shared/types/Topology';
import {
  apiRequest,
  apiServiceRequest,
} from '@fbcnms/tg-nms/app/apiutils/ServiceAPIUtil';
import {convertType, objectValuesTypesafe} from './ObjectHelpers';

import type {
  ANPLink,
  ANPLinkUploadKmlType,
  ANPSector,
  ANPSite,
  ANPSiteUploadKmlType,
  ANPUploadTopologyType,
  ApiBuilerInput,
  LinkTemplate,
  NodeTemplate,
  UploadTopologyType,
} from '@fbcnms/tg-nms/app/constants/TemplateConstants';
import type {
  LinkType,
  NodeType,
  SiteType,
} from '@fbcnms/tg-nms/shared/types/Topology';

function createLinkData(overrides?: LinkTemplate): $Shape<LinkType> {
  return {
    a_node_name: overrides?.a_node_name || '',
    z_node_name: overrides?.z_node_name || '',
    link_type: LinkTypeValueMap.WIRELESS,
    is_alive: false,
    linkup_attempts: 0,
    is_backup_cn_link: false,
  };
}

function createNodeData(overrides?: $Shape<NodeType>): $Shape<NodeType> {
  return {
    name: overrides?.name || '',
    node_type: overrides?.node_type || NodeTypeValueMap.DN,
    pop_node: overrides?.pop_node || false,
    site_name: overrides?.site_name || '',
    ant_azimuth: overrides?.ant_azimuth || 0,
    ant_elevation: overrides?.ant_elevation || 0,
  };
}

export function templateTopologyBuilderRequest(input: ApiBuilerInput) {
  const {template, networkName, onClose} = input;
  const links = [];
  const nodes = template.nodes.map((nodeTemplate, index) => {
    const siteName = template.site.name;
    nodeTemplate.name = siteName + '_' + (index + 1);
    nodeTemplate.site_name = siteName;

    nodeTemplate.links?.forEach(linkTemplate => {
      if (linkTemplate.z_node_name !== 'none') {
        links.push(createLinkData(linkTemplate));
      }
    });

    return createNodeData(nodeTemplate);
  });

  const data = {
    sites: [template.site],
    nodes,
    links,
  };

  apiServiceRequest(networkName, 'bulkAdd', data)
    .then(_result => {
      onClose('success');
    })
    .catch(error => onClose(error.message));
}

export function handleTopologyChangeSnackbar(
  changeMessage: ?string,
  snackbars: any,
) {
  if (changeMessage === 'success') {
    snackbars.success(
      'Topology successfully changed! Please wait a few moments for the topology to update.',
    );
  } else {
    snackbars.error(
      `Topology change failed${changeMessage ? ':' + changeMessage : ''} `,
    );
  }
}

export function uploadTopologyBuilderRequest(
  data: UploadTopologyType,
  networkName: string,
  onClose: (message?: string) => void,
) {
  apiRequest({networkName, endpoint: 'bulkAdd', data})
    .then(_result => onClose('success'))
    .catch(error => onClose(error.message));
}

export function parseANPJson(
  input: ?ANPUploadTopologyType,
  acceptableStatus: Set<number> = new Set<number>([
    ANP_STATUS_TYPE.PROPOSED,
    ANP_STATUS_TYPE.EXISTING,
  ]),
) {
  if (!input) return {sites: [], nodes: [], links: []};

  const sites = objectValuesTypesafe<ANPSite>(input.sites)
    .filter(site => acceptableStatus.has(site.status_type))
    .map<SiteType>(site => ({
      name: site.site_id,
      location: site.loc,
    }));

  const getNodeName = sector => `${sector.site_id}_${sector.node_id}`;
  const validSectors = objectValuesTypesafe<ANPSector>(input.sectors).filter(
    sector =>
      // Use the primary sector as proxy for the node.
      sector.position_in_node === 0 &&
      sector.node_id !== -1 && // Ignore imaginary nodes.
      acceptableStatus.has(sector.status_type),
  );
  const sectorToNode = {};
  validSectors.forEach(sector => {
    sectorToNode[sector.sector_id] = getNodeName(sector);
  });
  const nodes = validSectors.map<NodeTemplate>(sector => ({
    name: getNodeName(sector),
    node_type:
      sector.node_type === ANP_NODE_TYPE.CN
        ? ANP_NODE_TYPE.CN
        : ANP_NODE_TYPE.DN,
    pop_node: sector.node_type === ANP_NODE_TYPE.DN_POP_CONNECTION,
    site_name: sector.site_id,
    ant_azimuth: sector.ant_azimuth,
    ant_elevation: 0, // In active development from ANP team (7/8/21)
  }));

  const links = objectValuesTypesafe<ANPLink>(input.links)
    .filter(link => acceptableStatus.has(link.status_type))
    .map<LinkTemplate>(link => ({
      a_node_name: sectorToNode[link.tx_sector_id],
      z_node_name: sectorToNode[link.rx_sector_id],
    }));

  return {sites, nodes, links};
}

export function parseANPKml(
  input: ?Array<ANPSiteUploadKmlType | ANPLinkUploadKmlType>,
  sectorCount: number,
) {
  if (!input) return {sites: [], nodes: [], links: []};

  const {sites, links} = input.reduce(
    (
      result: {
        sites: Array<ANPSiteUploadKmlType>,
        links: Array<ANPLinkUploadKmlType>,
      },
      asset,
    ) => {
      if (asset.geometry.type === kmlFeatureType.site) {
        result.sites.push(convertType<ANPSiteUploadKmlType>(asset));
      } else if (asset.geometry.type === kmlFeatureType.link) {
        result.links.push(convertType<ANPLinkUploadKmlType>(asset));
      }
      return result;
    },
    {sites: [], links: []},
  );

  const uploadResults = {sites: [], links: [], nodes: []};

  sites.forEach(asset => {
    if (
      asset.properties.site_type !== kmlANPStatus.DEMAND &&
      (!asset.properties.Status ||
        kmlANPStatus[asset.properties.Status] === kmlANPStatus.PROPOSED ||
        kmlANPStatus[asset.properties.Status] === kmlANPStatus.EXISTING)
    ) {
      uploadResults.sites.push({
        name: asset.properties.name,
        location: {
          latitude: asset.geometry.coordinates[1],
          longitude: asset.geometry.coordinates[0],
          altitude: asset.geometry.coordinates[2],
          accuracy: 1000,
        },
      });
      if (asset.properties['Site Type'] || asset.properties.site_type) {
        const siteType =
          asset.properties['Site Type'] ?? asset.properties.site_type;
        if (siteType === kmlSiteType.CN) {
          uploadResults.nodes.push({
            name: asset.properties.name + '_1',
            node_type: ANP_NODE_TYPE.CN,
            pop_node: false,
            site_name: asset.properties.name,
          });
        } else if (siteType === kmlSiteType.DN) {
          for (let i = 1; i <= sectorCount; i++) {
            uploadResults.nodes.push({
              name: asset.properties.name + '_' + i,
              node_type: ANP_NODE_TYPE.DN,
              pop_node: false,
              site_name: asset.properties.name,
            });
          }
        } else if (siteType === kmlSiteType.POP) {
          for (let i = 1; i <= sectorCount; i++) {
            uploadResults.nodes.push({
              name: asset.properties.name + '_' + i,
              node_type: ANP_NODE_TYPE.DN,
              pop_node: true,
              site_name: asset.properties.name,
            });
          }
        }
      }
    }
  });

  links.forEach(asset => {
    const siteNames = asset.properties.name.split('-');
    if (
      siteNames.length === 2 &&
      (!asset.properties.styleURL ||
        asset.properties.styleURL.includes(kmlANPStatus.EXISTING) ||
        asset.properties.styleURL.includes(kmlANPStatus.PROPOSED))
    ) {
      const siteTypes = getSiteTypes({siteNames, sites});
      if (!siteTypes[0] || !siteTypes[1]) {
        return;
      }

      const sectorA =
        siteTypes[0] === kmlSiteType.CN
          ? SECTOR_DEFAULT
          : calculateSector({
              coordinates: asset.geometry.coordinates,
              sectorCount,
            });
      const sectorB =
        siteTypes[1] === kmlSiteType.CN
          ? SECTOR_DEFAULT
          : calculateSector({
              coordinates: asset.geometry.coordinates.reverse(),
              sectorCount,
            });

      const a_node_name = siteNames[0] + '_' + sectorA;
      const z_node_name = siteNames[1] + '_' + sectorB;

      uploadResults.links.push({
        name: `link-${a_node_name}-${z_node_name}`,
        a_node_name,
        z_node_name,
        link_type: 1,
      });
    }
  });

  return uploadResults;
}

function calculateSector({
  coordinates,
  sectorCount,
}: {
  coordinates: Array<Array<number>>,
  sectorCount: number,
}) {
  //In the KML files provided there are sites and links but no nodes.
  //This code calculates the angle bearing from one site to the other.
  //With the number of sectors declared, we can assign which node/radio
  //the link should be created between.

  const lat1 = coordinates[0][1];
  const lng1 = coordinates[0][0];
  const lat2 = coordinates[1][1];
  const lng2 = coordinates[1][0];
  const dLon = lng2 - lng1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  return Math.ceil(brng / (360 / sectorCount));
}

function getSiteTypes({
  siteNames,
  sites,
}: {
  siteNames: Array<string>,
  sites: Array<ANPSiteUploadKmlType>,
}) {
  return siteNames.map(siteName => {
    const currentSite = sites.find(site => site.properties.name === siteName);
    return (
      currentSite?.properties['Site Type'] ?? currentSite?.properties.site_type
    );
  });
}
