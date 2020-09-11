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
import NetworkContext from '../../contexts/NetworkContext';
import StatusIndicator, {
  StatusIndicatorColor,
} from '../../components/common/StatusIndicator';
import Typography from '@material-ui/core/Typography';
import {configModes} from '../../constants/ConfigConstants';
import {getNodeOverridesConfig} from '../../apiutils/ConfigAPIUtil';
import {getTopologyNodeList} from '../../helpers/ConfigHelpers';
import {makeStyles} from '@material-ui/styles';

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
  mode: $Keys<typeof configModes>,
  onSelectNode: string => void,
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

  const handleInput = React.useCallback(e => {
    setSearchFilter(e.target.value);
  }, []);

  const handleSelectNode = React.useCallback(
    e => {
      onSelectNode(e.target.innerHTML);
    },

    [onSelectNode],
  );
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
  }, [networkName]);

  const nodeList = getTopologyNodeList(networkConfig, nodeOverrides);

  const filteredNodeList = nodeList.filter(node => {
    const correctMode =
      configModes[mode] === configModes.POP
        ? node.isPop
        : configModes[mode] === configModes.CN
        ? node.isCn
        : true;
    return node.name.includes(searchFilter) && correctMode;
  });

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
          return (
            <ListItem
              key={node.name}
              button
              dense
              selected={isSelected}
              onClick={handleSelectNode}>
              <ListItemText
                primary={node.name}
                primaryTypographyProps={
                  node.hasOverride
                    ? {
                        className: classes.selectedNodePrimaryText,
                        variant: 'subtitle2',
                      }
                    : null
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
