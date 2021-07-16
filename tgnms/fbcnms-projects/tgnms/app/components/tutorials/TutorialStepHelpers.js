/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import AddLocationIcon from '@material-ui/icons/AddLocation';
import React from 'react';
import RouterIcon from '@material-ui/icons/Router';
import SiteMarker from './images/SiteMarker.svg';
import {
  ADDITIONAL_CONTENT,
  ERROR_MESSAGE,
  LINK_NODES,
  SITE_ADDITIONAL_CONTENT,
  SITE_NUMBERS,
  SITE_NUMBERS_VALUES,
  STEP_TARGET,
  TYPE,
} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';

export function addSiteFlow(siteNumber: $Values<typeof SITE_NUMBERS>) {
  const type = TYPE[siteNumber];
  const additionalContent = SITE_ADDITIONAL_CONTENT[siteNumber];
  return [
    {
      title: 'Open the topology toolbar',
      content: (
        <>
          <div>
            Select the node icon <RouterIcon /> to expand the topology toolbar.
          </div>
          <div>
            You can then add topology elements, such as sites, nodes and links.
          </div>
        </>
      ),
      target: `.${STEP_TARGET.TOPOLOGY_TOOLBAR}`,
      error: ERROR_MESSAGE,
      placement: 'right',
    },
    {
      title: `Add the ${SITE_NUMBERS_VALUES[siteNumber].name} site`,
      content: (
        <>
          <div>
            Select the site icon <AddLocationIcon /> to add a new site.
          </div>
          <div>{additionalContent[ADDITIONAL_CONTENT.SELECT_SITE]}</div>
        </>
      ),
      target: `.${STEP_TARGET.ADD_SITE}`,
      error: ERROR_MESSAGE,
      placement: 'right',
    },
    {
      title: `Move the ${SITE_NUMBERS_VALUES[siteNumber].name} site`,
      content: (
        <>
          <div>
            Move the white circle <img src={SiteMarker} /> to the desired {type}{' '}
            site location.
          </div>
          <div>{additionalContent[ADDITIONAL_CONTENT.MOVE_SITE]}</div>
        </>
      ),
      target: `.${STEP_TARGET.MAP}`,
    },
    {
      title: 'Change the site name',
      content: `Choose a new name for this site, such as Site_${SITE_NUMBERS_VALUES[siteNumber].number}. Site names cannot be repeated within a network.`,
      target: `.${STEP_TARGET.SITE_NAME}`,
      placement: 'left',
    },
    {
      title: 'Open the Nodes section',
      content: (
        <div>
          Expand the <b>Nodes</b> section to manage nodes at the new site. You
          can then view, add and configure nodes.
        </div>
      ),
      target: `.${STEP_TARGET.NODE_SECTION}`,
      placement: 'left',
      error: ERROR_MESSAGE,
    },
    {
      title: 'Add a node',
      content: (
        <div>
          Select <b>+ Add Node</b> to add a new node to this site. You can then
          designate it as a {type}.
        </div>
      ),
      target: `.${STEP_TARGET.ADD_NODE}`,
      error: ERROR_MESSAGE,
      placement: 'left',
    },
    {
      title: `Select ${type} as the node type`,
      content: `This site will have a ${
        additionalContent[ADDITIONAL_CONTENT.SELECT_NODE_TYPE]
      }`,
      target: `.${STEP_TARGET.NODE_TYPE}`,
      placement: 'left',
    },
    {
      title: 'Change the node name',
      content: `Choose a new name for this node, such as ${type}_${SITE_NUMBERS_VALUES[siteNumber].number}, or keep the name provided. Node names cannot be repeated within a network.`,
      target: `.${STEP_TARGET.NODE_NAME}`,
      placement: 'left',
    },
    ...addRadioMacFlow(),
    ...(type === 'POP' ? configFlow() : []),
    ...addLinkFlow(siteNumber),
    {
      title: 'Save the new topology elements',
      content: (
        <div>
          Select <b>Save</b> to finish adding{' '}
          {additionalContent[ADDITIONAL_CONTENT.SAVE_TOPOLOGY]} to the NMS.
        </div>
      ),
      target: `.${STEP_TARGET.SAVE_TOPOLOGY}`,
    },
  ];
}

export function configFlow() {
  return [
    {
      title: 'Open the node configuration',
      content: (
        <div>
          Select <b>Show Node Configuration</b> to view and manage the node’s
          settings.
        </div>
      ),
      target: `.${STEP_TARGET.NODE_CONFIG}`,
    },
    {
      title: 'Select BGP routing',
      content: (
        <div>
          Choose <b>Upstream Routing</b> from the menu and set it to BGP. Most
          Terragraph networks have dynamic Border Gateway Protocol (BGP)
          routing, but some may have static routing.
        </div>
      ),
      target: `.${STEP_TARGET.CONFIG_MODAL}`,
      placement: 'left',
    },
    {
      title: 'Enter the POP IP address',
      content: 'Set the IP address of the POP.',
      target: `.${STEP_TARGET.CONFIG_MODAL}`,
      placement: 'left',
    },
    {
      title: 'Enter the POP interface',
      content:
        'Set the interface on the POP that routes traffic to the gateway. You can log on to the POP node to find it if you don’t know it already.',
      target: `.${STEP_TARGET.CONFIG_MODAL}`,
      placement: 'left',
    },
    {
      title: 'Enter the Local ASN',
      content:
        'Set the local ASN on the POP that routes traffic to the gateway.',
      target: `.${STEP_TARGET.CONFIG_MODAL}`,
      placement: 'left',
    },
    {
      title: 'Enter the IPv6 neighbor address',
      content: (
        <div>
          Select <b>Add BGP Neighbor</b> to set the IPv6 neighbor address. You
          might find this on a sticker on the bottom of the router.
        </div>
      ),
      target: `.${STEP_TARGET.CONFIG_MODAL}`,
      placement: 'left',
    },

    {
      title: 'Save node configurations',
      content: (
        <div>
          Select <b>Save</b> to send the new configurations to the node.
        </div>
      ),
      target: `.${STEP_TARGET.CONFIG_MODAL}`,
      placement: 'left',
    },
  ];
}

export function addLinkFlow(siteNumber: $Values<typeof SITE_NUMBERS>) {
  const linkNodes = LINK_NODES[siteNumber];
  return [
    ...(linkNodes.length > 0
      ? [
          {
            title: 'Open the Links section',
            content: (
              <div>
                Expand the <b>Links</b> section to manage links at the new site.
                You can then view, add and configure links.
              </div>
            ),
            target: `.${STEP_TARGET.LINK_SECTION}`,
            placement: 'left',
            error: ERROR_MESSAGE,
          },
        ]
      : []),
    ...linkNodes.reduce(
      (result, linkNode, index) => [
        ...result,
        ...linkCreationFlow(linkNode, index, siteNumber),
      ],
      [],
    ),
  ];
}

function linkCreationFlow(
  toNode: string,
  index: number,
  siteNumber: $Values<typeof SITE_NUMBERS>,
) {
  const additionalContent = SITE_ADDITIONAL_CONTENT[siteNumber];

  return [
    {
      title: 'Add a link',
      content: (
        <div>
          Select <b>+ Add Link</b> to add a new link to this site.
        </div>
      ),
      target: `.${STEP_TARGET.ADD_LINK}`,
      placement: 'left',
      error: ERROR_MESSAGE,
    },
    {
      title: 'Select the DN',
      content: (
        <div>
          This link will originate from the distribution node (DN). For{' '}
          <b>From Node</b>, choose the name of the DN.
        </div>
      ),
      target: `.${STEP_TARGET.LINK_FORM}-${index}`,
      placement: 'left',
    },
    {
      title: 'Select a radio MAC address',
      content:
        'Choose a radio MAC address that belongs to the distribution node (DN).',
      target: `.${STEP_TARGET.LINK_FORM}-${index}`,
      placement: 'left',
    },
    {
      title: `Select the ${toNode}`,
      content: (
        <div>
          {additionalContent[ADDITIONAL_CONTENT.SELECT_TO_NODE][index]} For{' '}
          <b>To Node</b>, choose the name of the {toNode}.
        </div>
      ),
      target: `.${STEP_TARGET.LINK_FORM}-${index}`,
      placement: 'left',
    },
    {
      title: `Select a radio MAC address`,
      content: `Choose a radio MAC address that belongs to the ${toNode}.`,
      target: `.${STEP_TARGET.LINK_FORM}-${index}`,
      placement: 'left',
    },
  ];
}

export function addRadioMacFlow() {
  return [
    {
      title: 'Add a radio MAC address',
      content: (
        <div>
          Select <b>Add Radio MAC Address</b> to enter at least one address.
          Some nodes might have up to 4 radios.
        </div>
      ),
      target: `.${STEP_TARGET.RADIO_MAC_ADDRESS}`,
      placement: 'left',
    },
    {
      title: 'Enter the radio MAC address',
      content:
        'At least one radio MAC address is required. If the node has more than one radio, you can add all the radio MAC addresses.',
      target: `.${STEP_TARGET.RADIO_MAC_ADDRESS}`,
      placement: 'left',
    },
  ];
}
