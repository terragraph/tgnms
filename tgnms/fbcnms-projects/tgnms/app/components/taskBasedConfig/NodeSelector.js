/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow strict-local
 */

import * as React from 'react';
import Input from '@material-ui/core/Input';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import NetworkContext from '@fbcnms/tg-nms/app/contexts/NetworkContext';
import StatusIndicator, {
  StatusIndicatorColor,
} from '@fbcnms/tg-nms/app/components/common/StatusIndicator';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import {CONFIG_MODES} from '@fbcnms/tg-nms/app/constants/ConfigConstants';
import {getNodeOverridesConfig} from '@fbcnms/tg-nms/app/apiutils/ConfigAPIUtil';
import {getTopologyNodeList} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';

import type {NodeConfigStatusType} from '@fbcnms/tg-nms/app/helpers/ConfigHelpers';

const useStyles = makeStyles(theme => ({
  list: {
    overflowY: 'auto',
    height: '45vh',
  },
  selectNodeHeader: {
    padding: '8px 20px 0',
  },
  nodeConfigSearch: {
    border: '1px solid lightGray',
    fontSize: 12,
    height: theme.spacing(3),
    padding: theme.spacing(),
  },
  selectedNodeSecondaryText: {
    lineHeight: 1.2,
  },
  selectedNodePrimaryText: {
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
}));

export type Props = {
  mode: $Keys<typeof CONFIG_MODES>,
  onSelectNode: NodeConfigStatusType => void,
  selectedNodeName: ?string,
};

export default function NodeSelector({
  onSelectNode,
  selectedNodeName,
  mode,
}: Props) {
  const classes = useStyles();
  const [searchFilter, setSearchFilter] = React.useState('');
  const [nodeOverrides, setNodeOverrides] = React.useState(null);
  const {networkConfig, networkName} = React.useContext(NetworkContext);
  const networkConfigRef = React.useRef(networkConfig);
  const handleInput = React.useCallback(e => {
    setSearchFilter(e.target.value);
  }, []);

  React.useEffect(() => {
    const getNodeOverrides = async () => {
      try {
        const nodeOverrides = await new Promise((resolve, _) => {
          getNodeOverridesConfig(
            networkName,
            res => resolve(res),
            error => console.error(error),
          );
        });
        setNodeOverrides(nodeOverrides);
      } catch (error) {
        console.error(error);
      }
    };

    getNodeOverrides();
  }, [networkName, selectedNodeName]);

  const nodeList = React.useMemo(
    () => getTopologyNodeList(networkConfigRef.current, nodeOverrides),
    [networkConfigRef, nodeOverrides],
  );

  const filteredNodeList = React.useMemo(
    () =>
      nodeList.filter(node => {
        let correctMode = true;
        if (CONFIG_MODES[mode] === CONFIG_MODES.POP) {
          correctMode = node.isPop;
        }
        if (CONFIG_MODES[mode] === CONFIG_MODES.CN) {
          correctMode = node.isCn;
        }
        if (CONFIG_MODES[mode] === CONFIG_MODES.OVERRIDE) {
          correctMode = node.hasOverride;
        }
        return (
          node.name.toLowerCase().includes(searchFilter.toLowerCase()) &&
          correctMode
        );
      }),
    [mode, nodeList, searchFilter],
  );

  React.useEffect(() => {
    if (filteredNodeList.length > 0 && selectedNodeName == null) {
      onSelectNode(filteredNodeList[0]);
    }
  }, [filteredNodeList, selectedNodeName, onSelectNode, mode]);

  return (
    <div>
      <div className={classes.selectNodeHeader}>
        <Typography variant="caption" gutterBottom>
          Select Node
        </Typography>
        <Input
          className={classes.nodeConfigSearch}
          value={searchFilter}
          data-testid="filter"
          onChange={handleInput}
          placeholder="Filter"
          fullWidth
          disableUnderline
        />
      </div>
      <List className={classes.list} component="nav">
        {filteredNodeList.length === 0 ? (
          <ListItem>
            <Typography variant="body2">No matching nodes.</Typography>
          </ListItem>
        ) : null}
        {filteredNodeList.map(node => {
          const isSelected = selectedNodeName === node.name;
          const defaultNameStyle = {noWrap: true};
          return (
            <ListItem
              key={node.name}
              button
              dense
              selected={isSelected}
              onClick={() => onSelectNode(node)}>
              <Tooltip title={node.name}>
                <ListItemText
                  primary={node.name}
                  primaryTypographyProps={
                    node.hasOverride
                      ? {
                          ...defaultNameStyle,
                          className: classes.selectedNodePrimaryText,
                          variant: 'subtitle2',
                        }
                      : defaultNameStyle
                  }
                  secondary={
                    isSelected && !node.isAlive
                      ? 'This node is offline, so the base values shown ' +
                        'may be inaccurate.'
                      : null
                  }
                  secondaryTypographyProps={{
                    className: classes.selectedNodeSecondaryText,
                  }}
                />
              </Tooltip>
              <ListItemSecondaryAction>
                <StatusIndicator
                  color={
                    node.isAlive
                      ? StatusIndicatorColor.GREEN
                      : StatusIndicatorColor.RED
                  }
                />
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
    </div>
  );
}
