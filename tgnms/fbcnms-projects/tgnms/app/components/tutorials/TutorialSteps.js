/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import CheckIcon from '@material-ui/icons/Check';
import Grid from '@material-ui/core/Grid';
import React from 'react';
import TGDefault from './images/TGDefault.png';
import TutorialProgressContent from './TutorialProgressContent';
import {
  ERROR_MESSAGE,
  MODULES,
  MODULE_TITLES,
  MOUNTING_LINK,
  QUICK_START_LINK,
  SITE_NUMBERS,
  STEP_TARGET,
} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {addSiteFlow} from './TutorialStepHelpers';
import {objectValuesTypesafe} from '@fbcnms/tg-nms/app/helpers/ObjectHelpers';

export const INTRO_STEPS = [
  {
    title: (
      <div>
        <div>Welcome to Terragraph</div>
        <div> Network Management System (NMS)</div>
      </div>
    ),
    content: (
      <div>
        We help internet service providers (ISPs) maintain high network
        availability and reliability.
        <br />
        <ul>
          <li>Test and track network performance and quality over time.</li>
          <li>
            Receive alerts about any issues without needing to check the NMS.
          </li>
          <li>
            Build resilient networks with automatic signal rerouting to fix
            connectivity issues.
          </li>
        </ul>
      </div>
    ),
    image: TGDefault,
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {next: 'Continue'},
  },
  {
    title: 'Set up a test network',
    content: (
      <Grid container spacing={2}>
        <Grid item>
          Today, you’ll create a new, operational 4-link network with one POP
          and three distribution nodes (DNs) using the NMS.
        </Grid>
        <Grid item>We’ll guide you through the following modules:</Grid>
        <Grid item>
          <ol>
            {objectValuesTypesafe<string>(MODULE_TITLES).map(moduleTitle => (
              <li key={moduleTitle}>{moduleTitle}</li>
            ))}
          </ol>
        </Grid>
      </Grid>
    ),
    image: TGDefault,
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {next: 'Continue'},
  },
  {
    title: 'Complete prerequisites',
    content: (
      <Grid container spacing={1}>
        <Grid item>
          Before getting started, make sure the following prerequisites have
          been met:
        </Grid>
        <Grid item container spacing={1}>
          <Grid item component="h4">
            Equipment
          </Grid>
          <Grid item container direction="row">
            <Grid item xs={1}>
              <CheckIcon style={{color: '#00AF5B'}} />
            </Grid>
            <Grid item xs={11}>
              The 4 nodes are positioned in a square and properly aligned.{' '}
              <a href={MOUNTING_LINK} target="_blank">
                Learn more
              </a>
              .
            </Grid>
          </Grid>
          <Grid item container direction="row">
            <Grid item xs={1}>
              <CheckIcon style={{color: '#00AF5B'}} />
            </Grid>
            <Grid item xs={11}>
              You have an IPv6-compatible router that can be configured for
              routing traffic to and from the Terragraph network prefix. It
              should support BGP routing, but static routing is also possible.
            </Grid>
          </Grid>
          <Grid item container direction="row">
            <Grid item xs={1}>
              <CheckIcon style={{color: '#00AF5B'}} />
            </Grid>
            <Grid item xs={11}>
              The node chosen to be the POP has an uplink to the router.
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          For more details about prerequisites, view the{' '}
          <a href={QUICK_START_LINK} target="_blank">
            Quick Start Guide
          </a>
          .
        </Grid>
      </Grid>
    ),
    image: TGDefault,
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {next: 'Get Started'},
  },
  {
    title: 'View the network name',
    content:
      'This is the name that was given to the new network. You can switch between different networks here, if they’re available.',
    target: `.${STEP_TARGET.NETWORK_NAME}`,
  },
  {
    title: 'Find your location',
    content:
      'Search for your current location using an address. This centers the map approximately where you’ll set up the network.',
    target: `.${STEP_TARGET.SEARCH}`,
  },
];

export const POP_STEPS = [
  {
    title: 'Here’s your progress so far.',
    content: (
      <TutorialProgressContent progress={1} subTitle="Now, let’s add a POP." />
    ),
    image: TGDefault,
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {next: 'Start Module'},
  },
  ...addSiteFlow(SITE_NUMBERS.FIRST),
];

export const PROVISION_POP_STEPS = [
  {
    title: 'Here’s your progress so far.',
    content: (
      <TutorialProgressContent
        progress={2}
        subTitle="You can start provisioning the POP."
      />
    ),
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {next: 'Start Module'},
  },
  {
    title: 'Connect the POP to a router',
    content:
      'Before you can provision the POP node, it should have an uplink to an IPv6-compatible router so it can connect to the NMS and the internet.',
    image: TGDefault,
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
  },
  {
    title: 'Select the site',
    content: 'On the map, select the site you added to the network.',
    target: `.${STEP_TARGET.MAP}`,
    error: ERROR_MESSAGE,
  },
  {
    title: 'View node information',
    content: 'Select the POP node you added to the site.',
    target: `.${STEP_TARGET.SITE_DETAILS}`,
    placement: 'left',
    error: ERROR_MESSAGE,
  },
  {
    title: 'Open the actions menu',
    content: (
      <div>
        Select <b>View Actions</b> to see actions you can take on the node.
      </div>
    ),
    target: `.${STEP_TARGET.NODE_ACTIONS}`,
    error: ERROR_MESSAGE,
    placement: 'left',
  },
  {
    title: 'View the node configuration',
    content: (
      <div>
        Select <b>Configure Node</b> in the menu to view the configurations for
        this node.
      </div>
    ),
    target: `.${STEP_TARGET.NODE_CONFIG}`,
    error: ERROR_MESSAGE,
    placement: 'left',
  },
  {
    title: 'View full node configuration',
    content: (
      <div>
        Select <b>Show Full configuration</b> in the modal to view the full
        configuration for this node.
      </div>
    ),
    target: `.${STEP_TARGET.CONFIG_MODAL}`,
    placement: 'right',
  },
  {
    title: 'Provision the POP',
    content:
      'Using these POP node configurations, follow the equipment manufacturer’s guidelines to provision the POP.',
    target: `.${STEP_TARGET.CONFIG_MODAL}`,
    placement: 'right',
  },
  {
    title: 'Close full node configuration',
    content: 'Close the full node configuration modal.',
    target: `.${STEP_TARGET.CONFIG_MODAL}`,
    placement: 'right',
  },
  {
    title: 'Close edit configuration modal',
    content: 'Close the edit configuration modal.',
    target: `.${STEP_TARGET.CONFIG_MODAL}`,
    placement: 'right',
  },
  {
    title: 'Confirm the node is online',
    content:
      'The site corresponding to the POP node will turn green once it’s successfully ignited. This should take no more than 5 minutes.',
    target: `.${STEP_TARGET.MAP}`,
  },
];

export const ADD_SECOND_SITE_STEPS = [
  {
    title: 'Here’s your progress so far.',
    content: (
      <TutorialProgressContent
        progress={3}
        subTitle="You’re ready to add the second site and a link."
      />
    ),
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {next: 'Start Module'},
  },
  ...addSiteFlow(SITE_NUMBERS.SECOND),
  {
    title: 'Confirm the link is active',
    content:
      'The link between the two sites will turn green once it’s active. This should take no more than 5 minutes.',
    target: `.${STEP_TARGET.MAP}`,
  },
];

export const ADD_THIRD_SITE_STEPS = [
  {
    title: 'Here’s your progress so far.',
    content: (
      <TutorialProgressContent
        progress={4}
        subTitle="Let’s add the third site and another link."
      />
    ),
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {next: 'Start Module'},
  },
  ...addSiteFlow(SITE_NUMBERS.THIRD),
  {
    title: 'Confirm the link is active',
    content:
      'The second link will turn green once it’s active. This should take no more than 5 minutes.',
    target: `.${STEP_TARGET.MAP}`,
  },
];

export const ADD_FINAL_SITE_STEPS = [
  {
    title: 'Here’s your progress so far.',
    content: (
      <TutorialProgressContent
        progress={5}
        subTitle="Next, add the final site and two links."
      />
    ),
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {next: 'Start Module'},
  },
  ...addSiteFlow(SITE_NUMBERS.FOURTH),
  {
    title: 'Confirm all links are active',
    content:
      'The links will turn green once they’re active. This should take no more than 5 minutes.',
    target: `.${STEP_TARGET.MAP}`,
  },
  {
    title: 'Congrats! You’ve finished setting up a 4-link network.',
    content: (
      <TutorialProgressContent
        progress={6}
        subTitle="You can now explore the NMS and see topology information, alerting, advanced configurations and more."
      />
    ),
    target: STEP_TARGET.MODAL_TARGET,
    placement: 'center',
    locale: {last: 'Explore the NMS'},
  },
];

export const TUTORIAL_STEPS = {
  [MODULES.INTRO]: INTRO_STEPS,
  [MODULES.POP]: POP_STEPS,
  [MODULES.PROVISION_POP]: PROVISION_POP_STEPS,
  [MODULES.ADD_SECOND_SITE]: ADD_SECOND_SITE_STEPS,
  [MODULES.ADD_THIRD_SITE]: ADD_THIRD_SITE_STEPS,
  [MODULES.ADD_FINAL_SITE]: ADD_FINAL_SITE_STEPS,
};
