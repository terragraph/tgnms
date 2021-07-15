/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import AssetElementWrapper from '@fbcnms/tg-nms/app/views/map/mappanels/TopologyBuilderPanel/AssetElementWrapper';
import Button from '@material-ui/core/Button';
import NodeForm from '@fbcnms/tg-nms/app/views/map/mappanels/TopologyBuilderPanel/NodeForm';
import {FORM_TYPE} from '@fbcnms/tg-nms/app/constants/MapPanelConstants';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {TOPOLOGY_ELEMENT} from '@fbcnms/tg-nms/app/constants/NetworkConstants';
import {makeStyles} from '@material-ui/styles';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';

const useStyles = makeStyles(() => ({
  addButton: {
    justifyContent: 'flex-start',
  },
}));

export default function NodeDetails() {
  const {
    elementType,
    formType,
    updateTopology,
    newTopology,
    setNewTopology,
  } = useTopologyBuilderContext();
  const classes = useStyles();
  const {site, nodes} = newTopology;
  const siteName = React.useMemo(() => site?.name ?? '', [site]);
  const {nextStep} = useTutorialContext();

  const currentNodeNumber = nodes?.length ?? 0;

  const handleAddNode = React.useCallback(() => {
    const newNodes = [...nodes, {name: `${siteName}_${currentNodeNumber}`}];
    updateTopology({nodes: newNodes});
    nextStep();
  }, [currentNodeNumber, siteName, nodes, nextStep, updateTopology]);

  const handleClose = React.useCallback(
    index => {
      const newNodes = [...nodes];
      newNodes.splice(index, 1);
      setNewTopology({...newTopology, nodes: newNodes});
    },
    [nodes, newTopology, setNewTopology],
  );

  if (elementType === TOPOLOGY_ELEMENT.NODE && formType === FORM_TYPE.EDIT) {
    return <NodeForm index={0} />;
  }

  return (
    <>
      {nodes &&
        nodes.map((_, index) => (
          <AssetElementWrapper onClose={() => handleClose(index)}>
            <NodeForm index={index} />
          </AssetElementWrapper>
        ))}
      {nodes.length < 4 && (
        <Button
          color="primary"
          className={`${classes.addButton} ${STEP_TARGET.ADD_NODE}`}
          fullWidth
          onClick={handleAddNode}>
          + Add Node
        </Button>
      )}
    </>
  );
}
