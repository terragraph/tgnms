/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import * as React from 'react';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import TaskBasedConfigModal from '@fbcnms/tg-nms/app/components/taskBasedConfig/TaskBasedConfigModal';
import useForm from '@fbcnms/tg-nms/app/hooks/useForm';
import {STEP_TARGET} from '@fbcnms/tg-nms/app/components/tutorials/TutorialConstants';
import {useModalState} from '@fbcnms/tg-nms/app/hooks/modalHooks';
import {useTopologyBuilderContext} from '@fbcnms/tg-nms/app/contexts/TopologyBuilderContext';
import {useTutorialContext} from '@fbcnms/tg-nms/app/contexts/TutorialContext';

import type {NodeType} from '@fbcnms/tg-nms/shared/types/Topology';

export default function NodeConfig({node}: {node: $Shape<NodeType>}) {
  const {isOpen, open, close} = useModalState();
  const {updateNodeConfigs} = useTopologyBuilderContext();
  const {nextStep} = useTutorialContext();

  const {formState, updateFormState} = useForm({
    initialState: {},
  });

  const handleConfigSave = React.useCallback(() => {
    updateNodeConfigs({nodeName: node.name, nodeConfig: formState});
    nextStep();
    close();
  }, [formState, node, close, updateNodeConfigs, nextStep]);

  return (
    <Grid item className={STEP_TARGET.NODE_CONFIG}>
      <Button color="primary" onClick={open}>
        Show Node Configuration
      </Button>
      <TaskBasedConfigModal
        open={isOpen}
        modalTitle="Node Config"
        onClose={close}
        onSubmit={handleConfigSave}
        node={node}
        onUpdate={updateFormState}
      />
    </Grid>
  );
}
