/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import FormGroup from '@material-ui/core/FormGroup';
import FormLabel from '@material-ui/core/FormLabel';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import {defaultTemplate} from '../../constants/TemplateConstants';
import {makeStyles} from '@material-ui/styles';

import type {SiteTemplate} from '../../helpers/templateHelpers';
import type {TopologyType} from '../../../shared/types/Topology';

const useStyles = makeStyles(theme => ({
  select: {
    margin: theme.spacing(1),
  },
}));

export type Props = {
  currentTemplate: SiteTemplate,
  templates: Array<SiteTemplate>,
  nodeNumber: number,
  siteName: string,
  handleTemplateSelectionChange: string => any,
  updateTemplateDetails: ({
    detail: string,
    value: string | SiteTemplate,
  }) => any,
  topology: TopologyType,
  newSite: boolean,
};

export default function PlannedSiteTemplates(props: Props) {
  const {
    currentTemplate,
    templates,
    nodeNumber,
    siteName,
    handleTemplateSelectionChange,
    updateTemplateDetails,
    topology,
    newSite,
  } = props;

  const classes = useStyles();

  const handleNodeLinkChange = React.useCallback(
    (zNodeName: string, index: number, nodeName: string) => {
      const updatedNodes = [...currentTemplate.nodes];
      updatedNodes[index].links = [
        {a_node_name: nodeName, z_node_name: zNodeName},
      ];
      updateTemplateDetails({
        detail: 'currentTemplate',
        value: {...currentTemplate, nodes: updatedNodes},
      });
    },
    [currentTemplate, updateTemplateDetails],
  );

  const onTemplateChange = React.useCallback(
    ev => {
      handleTemplateSelectionChange(ev.target.value);
    },
    [handleTemplateSelectionChange],
  );

  return (
    <FormGroup row={false}>
      <Grid container direction="column" spacing={2}>
        {newSite && (
          <>
            <Grid item>
              <FormLabel component="legend">
                <span>Select Site Template</span>
              </FormLabel>
            </Grid>
            <Select
              value={currentTemplate.name}
              className={classes.select}
              onChange={onTemplateChange}>
              {templates.map(template => {
                return (
                  <MenuItem key={template.name} value={template.name}>
                    {template.name === defaultTemplate.name
                      ? template.name
                      : template.name + ' Template'}
                  </MenuItem>
                );
              })}
            </Select>
          </>
        )}
        <Grid item>
          <TextField
            id="name"
            key="name"
            label="Site Name"
            InputLabelProps={{shrink: true}}
            margin="dense"
            fullWidth
            value={siteName}
            onChange={ev => {
              updateTemplateDetails({detail: 'name', value: ev.target.value});
            }}
          />
        </Grid>

        {currentTemplate.name === defaultTemplate.name ? null : (
          <>
            {currentTemplate.nodes.length > 1 ? (
              <TextField
                select
                label="Select Number of Nodes"
                className={classes.select}
                value={nodeNumber}
                onChange={ev => {
                  updateTemplateDetails({
                    detail: 'nodeNumber',
                    value: ev.target.value,
                  });
                }}>
                {currentTemplate.nodes.map((node, index) => (
                  <MenuItem key={index + 1} value={index + 1}>
                    {index + 1}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <Grid item>
              <FormLabel component="legend">
                <span>Select Links</span>
              </FormLabel>
            </Grid>
            {currentTemplate.nodes.map((node, index) => {
              if (index > nodeNumber - 1) {
                return;
              }
              const nodeName = siteName + '_' + (index + 1);
              return (
                <TextField
                  defaultValue="none"
                  select
                  className={classes.select}
                  label={'link for ' + nodeName}
                  InputLabelProps={{shrink: true}}
                  margin="dense"
                  fullWidth
                  onChange={ev =>
                    handleNodeLinkChange(ev.target.value, index, nodeName)
                  }>
                  {topology.nodes.map(({name}) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                  <MenuItem key="none" value="none">
                    none
                  </MenuItem>
                </TextField>
              );
            })}
          </>
        )}
      </Grid>
    </FormGroup>
  );
}
