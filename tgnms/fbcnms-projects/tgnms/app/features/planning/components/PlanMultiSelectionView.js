/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */
import * as React from 'react';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Box from '@material-ui/core/Box';
import CloseIcon from '@material-ui/icons/Close';
import Divider from '@material-ui/core/Divider';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import {makeStyles} from '@material-ui/styles';
import {useNetworkPlanningManager} from '@fbcnms/tg-nms/app/features/planning/useNetworkPlanningManager';

const useStyles = makeStyles(theme => ({
  accordion: {
    '&.MuiAccordion-root:before': {
      // Remove divider above accordion
      height: '0',
    },
    boxShadow: 'none',
    border: '0 0',
    overflowWrap: 'anywhere',
  },
  summary: {
    // Move carot to opposite side.
    flexDirection: 'row-reverse',
    padding: '0 0',
    marginLeft: theme.spacing(-0.5),
    '& .MuiAccordionSummary-content': {
      marginLeft: theme.spacing(2),
    },
    '& .MuiAccordionSummary-expandIcon': {padding: '0'},
  },
}));

export default function PlanMultiSelectionView() {
  const {
    pendingTopology,
    filteredTopology,
    removeFromPendingTopology,
  } = useNetworkPlanningManager();
  const classes = useStyles();

  const [selectedSites, setSelectedSites] = React.useState({});
  const [selectedLinks, setSelectedLinks] = React.useState({});

  React.useEffect(() => {
    // Create our selected sites helper object.
    const siteToSelectedNodes = Array.from(pendingTopology.sites).reduce(
      (result, siteId) => {
        result[siteId] = new Set([]);
        return result;
      },
      {},
    );

    // Create our selected links.
    const _selectedLinks = {};
    pendingTopology.links.forEach(linkId => {
      const link = filteredTopology.links[linkId];
      _selectedLinks[link.link_id] = {
        name: `${link.tx_site_id} to ${link.rx_site_id}`,
        metrics: {},
      };

      // Add the nodes used by the links to our siteToSelectedNodes.
      for (const [siteId, nodeId] of [
        [link.rx_site_id, link.rx_sector_id],
        [link.tx_site_id, link.tx_sector_id],
      ])
        if (siteId in siteToSelectedNodes) {
          siteToSelectedNodes[siteId].add(nodeId);
        } else {
          siteToSelectedNodes[siteId] = new Set([nodeId]);
        }
    });

    // Create our selected sites.
    const _selectedSites = Object.keys(siteToSelectedNodes).reduce(
      (result, siteId) => {
        result[siteId] = {
          name: siteId,
          metrics: {Nodes: siteToSelectedNodes[siteId].size},
        };
        return result;
      },
      {},
    );
    setSelectedSites(_selectedSites);
    setSelectedLinks(_selectedLinks);
  }, [filteredTopology, pendingTopology]);

  const sitesLength = React.useMemo(() => Object.keys(selectedSites).length, [
    selectedSites,
  ]);
  const linksLength = React.useMemo(() => Object.keys(selectedLinks).length, [
    selectedLinks,
  ]);
  return (
    <>
      <Typography variant="h6">
        {sitesLength + linksLength} Plan Items Selected
      </Typography>
      <Accordion className={classes.accordion}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="sites-panel-content"
          id="sites-panel-header"
          className={classes.summary}>
          <Typography>
            <b>{sitesLength} Sites</b>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {sitesLength &&
              Object.keys(selectedSites).map(siteId => (
                <Grid item xs={12} key={siteId}>
                  <PlanItem
                    item={selectedSites[siteId]}
                    onClose={() => removeFromPendingTopology([siteId], 'sites')}
                  />
                </Grid>
              ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Box my={1} mx={-3}>
        <Divider />
      </Box>
      <Accordion className={classes.accordion}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="links-panel-content"
          id="links-panel-header"
          className={classes.summary}>
          <Typography>
            <b>{linksLength} Links</b>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {linksLength &&
              Object.keys(selectedLinks).map(linkId => (
                <Grid item xs={12} key={linkId}>
                  <PlanItem
                    item={selectedLinks[linkId]}
                    onClose={() => removeFromPendingTopology([linkId], 'links')}
                  />
                </Grid>
              ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
      <Box my={1} mx={-3}>
        <Divider />
      </Box>
    </>
  );
}

const usePlanItemStyles = makeStyles(theme => ({
  planItem: {
    backgroundColor: '#f7f6f6',
    borderRadius: theme.shape.borderRadius * 2.5,
    padding: theme.spacing(2),
  },
  closeButton: {
    justifyContent: 'flex-end',
    // Fix button being stretched out when view is shrunk.
    height: 'max-content',
  },
}));
type PlanItemType = {|name: string, metrics: {[string]: string | number}|};
function PlanItem({
  item: {name, metrics},
  onClose,
}: {
  item: PlanItemType,
  onClose: () => void,
}) {
  const classes = usePlanItemStyles();
  return (
    <Grid item container className={classes.planItem} spacing={1} xs={12}>
      <Grid item xs={9}>
        <Typography variant="body1">{name}</Typography>
      </Grid>
      <Grid item container xs={3} className={classes.closeButton}>
        <IconButton
          data-testid="remove-plan-item"
          size="small"
          onClick={() => onClose()}>
          <CloseIcon />
        </IconButton>
      </Grid>
      {metrics &&
        Object.keys(metrics).map(metricName => (
          <PlanItemMetric
            key={metricName}
            name={metricName}
            value={metrics[metricName]}
          />
        ))}
    </Grid>
  );
}

const usePlanItemMetricStyles = makeStyles(() => ({
  planItemMetric: {overflowWrap: 'normal'},
  dashedLine: {
    borderBottom: '1px dashed black',
    height: '70%',
    margin: '0 0.5rem',
  },
}));
function PlanItemMetric({name, value}: {name: string, value: string | number}) {
  const classes = usePlanItemMetricStyles();
  return (
    <Grid item container xs={12} className={classes.planItemMetric}>
      <Grid item xs={2}>
        <Typography variant="caption">{name}</Typography>
      </Grid>
      <Grid item xs={9}>
        <Box className={classes.dashedLine} />
      </Grid>
      <Grid item xs={1}>
        <Typography variant="caption">{value}</Typography>
      </Grid>
    </Grid>
  );
}
