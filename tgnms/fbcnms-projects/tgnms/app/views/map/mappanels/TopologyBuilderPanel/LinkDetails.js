/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AssetElementWrapper from '@fbcnms/tg-nms/app/views/map/mappanels/TopologyBuilderPanel/AssetElementWrapper';
import Button from '@material-ui/core/Button';
import LinkForm from '@fbcnms/tg-nms/app/views/map/mappanels/TopologyBuilderPanel/LinkForm';
import {makeStyles} from '@material-ui/styles';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';

const useStyles = makeStyles(() => ({
  addButton: {
    justifyContent: 'flex-start',
  },
}));

export default function LinkDetails() {
  const {
    updateTopology,
    newTopology,
    setNewTopology,
  } = useTopologyBuilderContext();
  const classes = useStyles();
  const {links} = newTopology;

  const handleAddLink = React.useCallback(() => {
    const newLinks = [...links, {}];
    updateTopology({links: newLinks});
  }, [links, updateTopology]);

  const handleClose = React.useCallback(
    index => {
      const newLinks = [...links];
      newLinks.splice(index, 1);
      setNewTopology({...newTopology, links: newLinks});
    },
    [links, newTopology, setNewTopology],
  );

  return (
    <>
      {links &&
        links.map((_, index) => (
          <AssetElementWrapper onClose={() => handleClose(index)}>
            <LinkForm index={index} />
          </AssetElementWrapper>
        ))}
      <Button
        color="primary"
        className={classes.addButton}
        fullWidth
        onClick={handleAddLink}>
        + Add Link
      </Button>
    </>
  );
}
