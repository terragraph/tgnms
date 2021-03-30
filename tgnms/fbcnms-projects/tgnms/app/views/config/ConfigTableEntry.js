/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 * @flow
 */

import ConfigMetadataBlock from './ConfigMetadataBlock';
import ConfigTableEntryIcon from './ConfigTableEntryIcon';
import ConfigTaskInput from '../../components/taskBasedConfig/ConfigTaskInput';
import DeleteIcon from '@material-ui/icons/Delete';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import React from 'react';
import RedoIcon from '@material-ui/icons/Redo';
import SaveIcon from '@material-ui/icons/Save';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import UndoIcon from '@material-ui/icons/Undo';
import classNames from 'classnames';
import swal from 'sweetalert2';
import {
  BASE_VALUE_LAYERS_TO_SKIP,
  CONFIG_FIELD_DELIMITER,
  CONFIG_LAYER,
} from '../../constants/ConfigConstants';
import {
  getConfigLayer,
  getTopLayerValue,
  validateField,
} from '../../helpers/ConfigHelpers';
import {isPunctuation, toTitleCase} from '../../helpers/StringHelpers';
import {makeStyles} from '@material-ui/styles';
import {truncate} from 'lodash';
import {useConfigTaskContext} from '../../contexts/ConfigTaskContext';

import type {ConfigDataLayerType} from '../../constants/ConfigConstants';

const useStyles = makeStyles(theme => ({
  sectionSpacer: {
    height: theme.spacing(),
  },
  hidden: {
    display: 'none',
  },
  bold: {
    fontWeight: 'bold',
  },
  strikethrough: {
    textDecoration: 'line-through',
  },
  red: {
    color: 'red',
  },
  wrap: {
    overflowWrap: 'break-word',
    wordBreak: 'break-all',
  },
  noWrap: {
    whiteSpace: 'nowrap',
  },
  list: {
    paddingTop: 0,
    paddingBottom: 4,
  },
  listItemIcon: {
    marginRight: 0,
  },
  statusIcon: {
    fontSize: 16,
    padding: '0 1px',
    verticalAlign: 'text-bottom',
  },
  tr: {
    cursor: 'pointer',
    height: theme.spacing(4),
  },
  tdField: {
    // TODO Find a better way to prevent table from overflowing (x)
    maxWidth: '25vw',
    overflowWrap: 'break-word',
  },
  tdExpanded: {
    borderBottom: 'none',
  },
  detailsTr: {
    height: 'auto',
  },
  detailsTd: {
    maxWidth: 0, // TODO I have no idea why this works, but it improves spacing
    verticalAlign: 'top',
    transition: theme.transitions.create(['padding', 'opacity'], {
      easing: theme.transitions.easing.easeInOut,
      duration: theme.transitions.duration.shorter,
    }),
  },
  detailsTdHidden: {
    paddingTop: 0,
    paddingBottom: 0,
    opacity: 0,
  },
  detailsContainer: {
    transition: theme.transitions.create('max-height', {
      easing: theme.transitions.easing.easeInOut,
      duration: theme.transitions.duration.shorter,
    }),
    maxHeight: 10000, // arbitrary high value for animation purposes
    overflow: 'hidden',
  },
  detailsContainerCollapsed: {
    maxHeight: 0,
  },
  detailsText: {
    wordBreak: 'break-word',
    transition: theme.transitions.create('line-height', {
      easing: theme.transitions.easing.easeInOut,
      duration: theme.transitions.duration.shorter,
    }),
  },
  detailsTextHidden: {
    lineHeight: 0,
  },
}));

type Props = {
  field: Array<string>,
  layers: ConfigDataLayerType,
  hasOverride: boolean,
  metadata: Object,
  onSelect: (?Array<string>) => any,
  isSelected: boolean,
  isVisible: boolean,
  colSpan: number,
};

export default function ConfigTableEntry(props: Props) {
  const classes = useStyles();
  const {
    field,
    layers,
    hasOverride,
    metadata,
    onSelect,
    isSelected,
    isVisible,
    colSpan,
  } = props;

  const {onUpdate, editMode, selectedValues} = useConfigTaskContext();
  const {refreshConfig} = selectedValues;
  const {type, desc, deprecated, readOnly} = metadata;
  const configField = field.join(CONFIG_FIELD_DELIMITER);

  const getUnderlyingValue = React.useCallback(() => {
    // Returns the underlying value (i.e. non-draft, non-override)
    const defaultValue = null;
    if (layers.length < BASE_VALUE_LAYERS_TO_SKIP) {
      return defaultValue; // shouldn't happen
    }
    for (let i = layers.length - BASE_VALUE_LAYERS_TO_SKIP; i >= 0; i--) {
      if (layers[i].value !== null) {
        return layers[i].value;
      }
    }
    return defaultValue;
  }, [layers]);

  const getFieldValue = React.useCallback((layers, defaultValue = null) => {
    // Returns the field value, given all layers (in increasing order)
    // If the draft value is null, ignore the override value
    return getTopLayerValue({layers}) ?? defaultValue;
  }, []);

  const configLayer = getConfigLayer({editMode});

  const hasTopLevelOverride = React.useMemo(() => {
    return layers.find(layer => layer.id === configLayer)?.value !== null;
  }, [layers, configLayer]);

  const initialBaseValue = React.useMemo(() => {
    const fieldValue = getFieldValue(layers, metadata.defaultValue);
    return fieldValue !== null ? fieldValue : null;
  }, [layers, getFieldValue, metadata]);

  const [baseValue, setBaseValue] = React.useState(initialBaseValue);
  const [isOverrideDeleted, setIsOverrideDeleted] = React.useState(false);
  const [localInputValue, setLocalInputValue] = React.useState(
    initialBaseValue,
  );
  const [lazyInit, setLazyInit] = React.useState(false);
  const [hasDraftOverride, setHasDraftOverride] = React.useState(false);

  const handleDiscardChanges = React.useCallback(() => {
    // Discard local input value changes

    setLocalInputValue(baseValue);
  }, [baseValue]);

  React.useEffect(() => {
    setBaseValue(initialBaseValue);
    setLocalInputValue(initialBaseValue);
    setHasDraftOverride(false);
  }, [initialBaseValue, refreshConfig]);

  React.useEffect(() => {
    if (isSelected && !lazyInit) {
      setLazyInit(true);
    }
  }, [isSelected, lazyInit, handleDiscardChanges]);

  function textClasses(...classList) {
    // Helper function to apply text classes (for transitions)
    return classNames(
      ...classList,
      classes.detailsText,
      !isSelected && classes.detailsTextHidden,
    );
  }

  const handleSave = () => {
    // Save the local input value as the draft value

    // Validate the field
    if (!validateField(localInputValue, metadata)) {
      swal({
        title: 'Error',
        text: 'That value is not allowed.',
        type: 'error',
      });
      return;
    }
    if (localInputValue && field) {
      onUpdate({configField, draftValue: localInputValue});
      setBaseValue(localInputValue);
      setHasDraftOverride(true);
    }
  };

  const handleRemoveOverride = React.useCallback(() => {
    // Remove the override value
    onUpdate({
      configField,
      draftValue: null,
    });
    if (hasTopLevelOverride && !hasDraftOverride) {
      const baseValue = getUnderlyingValue();
      setIsOverrideDeleted(true);
      setLocalInputValue(baseValue || '');
      setBaseValue(baseValue || '');
    } else {
      setLocalInputValue(initialBaseValue);
      setBaseValue(initialBaseValue);
    }
    setHasDraftOverride(false);
  }, [
    configField,
    getUnderlyingValue,
    hasDraftOverride,
    hasTopLevelOverride,
    initialBaseValue,
    onUpdate,
  ]);

  const handleRestoreOverride = React.useCallback(() => {
    // Restore the override value
    onUpdate({
      configField,
      draftValue: initialBaseValue,
    });
    setLocalInputValue(initialBaseValue);
    setBaseValue(initialBaseValue);
    setIsOverrideDeleted(false);
  }, [initialBaseValue, onUpdate, configField]);

  const handleSelect = React.useCallback(() => {
    // Handle selecting this row (i.e. toggling the expansion)
    onSelect(field);
  }, [onSelect, field]);

  const handleInputChange = React.useCallback(
    value => {
      // Handle an input field change
      if (value !== localInputValue) {
        setLocalInputValue(value);
      }
    },
    [localInputValue],
  );

  let description = desc || 'n/a';
  if (isPunctuation(description.slice(-1))) {
    description = description.slice(0, -1);
  }

  // Get the config value
  const defaultValue = metadata.hasOwnProperty('defaultValue')
    ? metadata.defaultValue
    : null;

  // Determine which layers to display (when expanded)
  // Hide empty layers, and the draft layer if unchanged
  const renderedLayers = React.useMemo(
    () =>
      layers.filter(layer => {
        if (layer.id === CONFIG_LAYER.BASE) {
          return true;
        } else if (layer.id === CONFIG_LAYER.DRAFT && hasDraftOverride) {
          return true;
        } else {
          return layer.value !== null;
        }
      }),
    [layers, hasDraftOverride],
  );

  const mainTdProps = {
    className: classNames(
      isSelected && classes.tdExpanded,
      (hasOverride || hasDraftOverride) && classes.bold,
    ),
    size: 'small',
  };
  const detailsTdProps = {
    className: classNames(
      classes.detailsTd,
      !isSelected && classes.tdExpanded,
      !isSelected && classes.detailsTdHidden,
    ),
  };
  const detailsTdDivProps = {
    className: classNames(
      classes.detailsContainer,
      !isSelected && classes.detailsContainerCollapsed,
    ),
  };

  const localEqualsDraft = baseValue === localInputValue;

  const actions = [
    {
      text: 'Save',
      icon: <SaveIcon />,
      func: handleSave,
      enabled: !localEqualsDraft,
    },
    hasTopLevelOverride && isOverrideDeleted
      ? {
          text: 'Restore Override',
          icon: <RedoIcon />,
          func: handleRestoreOverride,
          enabled: hasTopLevelOverride,
        }
      : {
          text: 'Remove Override',
          icon: <UndoIcon />,
          func: handleRemoveOverride,
          enabled: hasTopLevelOverride || hasDraftOverride,
        },
    {
      text: 'Discard Changes',
      icon: <DeleteIcon />,
      func: handleDiscardChanges,
      enabled: !localEqualsDraft,
    },
  ];

  const customConfigField = Object.keys(metadata).length === 0;
  if (customConfigField) {
    actions.push({
      text: 'Delete Custom Config',
      icon: <HighlightOffIcon />,
      func: handleRemoveOverride,
      enabled: hasTopLevelOverride,
    });
  }

  return (
    <React.Fragment key={field.join('\0')}>
      <TableRow
        className={classNames(classes.tr, !isVisible && classes.hidden)}
        hover={!isSelected}
        selected={isSelected}
        onClick={handleSelect}>
        <TableCell
          component="th"
          scope="row"
          classes={{
            root: classNames(
              classes.tdField,
              deprecated && classes.strikethrough,
            ),
          }}
          {...mainTdProps}>
          {configField}
          {hasDraftOverride ? <span className={classes.red}> *</span> : null}
        </TableCell>
        <TableCell
          component="th"
          scope="row"
          classes={{
            root: classNames(
              classes.tdField,
              deprecated && classes.strikethrough,
            ),
          }}
          {...mainTdProps}>
          {description}
        </TableCell>
        <TableCell classes={{root: classes.noWrap}} {...mainTdProps}>
          {hasOverride || hasDraftOverride
            ? 'modified '
            : localInputValue !== null || defaultValue !== null
            ? 'default'
            : 'unset'}
          {(hasOverride || hasDraftOverride) && (
            <ConfigTableEntryIcon
              renderedLayers={renderedLayers}
              hasDraftOverride={hasDraftOverride}
            />
          )}
        </TableCell>
        <TableCell {...mainTdProps}>{type ? toTitleCase(type) : '?'}</TableCell>
        <TableCell classes={{root: classes.wrap}} {...mainTdProps}>
          {isSelected && !deprecated && !readOnly ? (
            <div onClick={ev => ev.stopPropagation()} role="none">
              <ConfigTaskInput
                configField={configField}
                onChange={handleInputChange}
                type={type}
                selectBoolean={true}
                initialValue={localInputValue}
              />
            </div>
          ) : localInputValue !== null ? (
            truncate(String(localInputValue), {length: 256})
          ) : defaultValue !== null ? (
            defaultValue
          ) : null}
        </TableCell>
      </TableRow>
      {lazyInit ? (
        <TableRow
          className={classNames(
            classes.tr,
            classes.detailsTr,
            !isVisible && classes.hidden,
          )}
          selected={isSelected}
          onClick={handleSelect}>
          <TableCell {...detailsTdProps} colSpan={colSpan - 1}>
            <div {...detailsTdDivProps}>
              <ConfigMetadataBlock
                metadata={metadata}
                textClassName={textClasses()}
              />
              {renderedLayers.length > 1 ? (
                <>
                  <Typography
                    variant="subtitle2"
                    className={textClasses(classes.bold)}>
                    Overrides
                  </Typography>
                  {renderedLayers.map(layer => (
                    <Typography
                      key={layer.id}
                      variant="body2"
                      className={textClasses(
                        layer.id == configLayer &&
                          isOverrideDeleted &&
                          classes.strikethrough,
                      )}>
                      <em>{layer.id}: </em>
                      {layer.id === CONFIG_LAYER.DRAFT ? (
                        String(localInputValue)
                      ) : layer.value !== null ? (
                        String(layer.value)
                      ) : (
                        <span className={classes.red}>not set</span>
                      )}
                    </Typography>
                  ))}
                  <div className={classes.sectionSpacer} />
                </>
              ) : null}
            </div>
          </TableCell>
          <TableCell {...detailsTdProps}>
            <div {...detailsTdDivProps}>
              {!deprecated && !readOnly ? (
                <List
                  classes={{root: classes.list}}
                  component="nav"
                  dense
                  onClick={ev => ev.stopPropagation()}>
                  {actions.map(({text, icon, func, enabled}) => (
                    <ListItem
                      key={text}
                      button
                      dense
                      disabled={!enabled}
                      onClick={func}>
                      <ListItemIcon classes={{root: classes.listItemIcon}}>
                        {icon}
                      </ListItemIcon>
                      <ListItemText primary={text} />
                    </ListItem>
                  ))}
                </List>
              ) : null}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </React.Fragment>
  );
}
