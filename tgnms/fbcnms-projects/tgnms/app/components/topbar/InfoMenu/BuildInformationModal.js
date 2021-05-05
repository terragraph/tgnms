/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import CustomAccordion from '@fbcnms/tg-nms/app/components/common/CustomAccordion';
import Grid from '@material-ui/core/Grid';
import MaterialModal from '@fbcnms/tg-nms/app/components/common/MaterialModal';
import React from 'react';
import axios from 'axios';
import useTaskState, {TASK_STATE} from '@fbcnms/tg-nms/app/hooks/useTaskState';
import {getUIConfig} from '@fbcnms/tg-nms/app/common/uiConfig';
import {makeStyles} from '@material-ui/styles';

const useStyles = makeStyles(() => ({
  button: {
    marginRight: '5px',
  },
}));

type Props = {
  buildInformationOpen: boolean,
  toggleBuildModal: () => void,
  version: string,
  commitDate: string,
  commitHash: string,
};

export default function BuildInformationModal(props: Props) {
  const {
    buildInformationOpen,
    toggleBuildModal,
    version,
    commitDate,
    commitHash,
  } = props;
  const classes = useStyles();
  const {env} = getUIConfig();
  const {ISSUES_URL} = env;

  return (
    <MaterialModal
      open={buildInformationOpen}
      onClose={toggleBuildModal}
      modalTitle="About"
      data-testid="about-modal"
      modalContent={
        <Grid container spacing={1}>
          <Grid item xs={4}>
            Version
          </Grid>
          <Grid item xs={8}>
            {version}-{commitHash}
          </Grid>
          <Grid item xs={4}>
            Date
          </Grid>
          <Grid item xs={8}>
            {commitDate}
          </Grid>
          <Grid item xs={12}>
            <ChangelogModal />
          </Grid>
        </Grid>
      }
      modalActions={
        <>
          {ISSUES_URL ? (
            <Button
              className={classes.button}
              href={ISSUES_URL}
              target="_blank"
              onClick={toggleBuildModal}
              variant="outlined">
              Submit Bug
            </Button>
          ) : null}
          <Button
            className={classes.button}
            onClick={toggleBuildModal}
            variant="outlined">
            Close
          </Button>
        </>
      }
    />
  );
}

function ChangelogModal() {
  const [changelog, setChangelog] = React.useState([]);
  const {isLoading, setState} = useTaskState({
    initialState: TASK_STATE.LOADING,
  });

  React.useEffect(() => {
    const getChangelog = async () => {
      try {
        const changeLogData = await axios.get('/api/v1/changelog');
        setChangelog(changeLogData.data);
        setState(TASK_STATE.SUCCESS);
      } catch {
        setState(TASK_STATE.ERROR);
      }
    };
    getChangelog();
  }, [setState]);

  return (
    <>
      {isLoading && <CircularProgress size={24} />}
      {changelog.map(versionData => {
        const versionStr = versionData.version;
        return (
          <VersionModal
            key={'version-' + versionStr}
            title={'Version ' + versionStr}
            diffs={versionData.diffs}
          />
        );
      })}
    </>
  );
}

function VersionModal({title, diffs}) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <CustomAccordion
      title={title}
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      details={
        <Grid container spacing={1}>
          <Grid item xs={4}>
            Date
          </Grid>
          <Grid item xs={8}>
            Title
          </Grid>
          {diffs &&
            diffs.map((diffData, idx) => (
              <React.Fragment key={'diff' + idx}>
                <Grid item xs={4}>
                  {diffData.date}
                </Grid>
                <Grid item xs={8}>
                  {diffData.title}
                </Grid>
              </React.Fragment>
            ))}
        </Grid>
      }
    />
  );
}
