/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @format
 */
'use strict';

import AssistantIcon from '@material-ui/icons/Assistant';
import classNames from 'classnames';
import {
  ConfigLayer,
  CONFIG_FIELD_DELIMITER,
} from '../../constants/ConfigConstants';
import ConfigFormInput from './ConfigFormInput';
import ConfigMetadataBlock from './ConfigMetadataBlock';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import {getNodeIcon} from '../../helpers/MapPanelHelpers';
import {isEqual, truncate} from 'lodash';
import {toTitleCase} from '../../helpers/StringHelpers';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import React from 'react';
import RedoIcon from '@material-ui/icons/Redo';
import SaveIcon from '@material-ui/icons/Save';
import ScatterPlotIcon from '@material-ui/icons/ScatterPlot';
import {shallowEqual, validateField} from '../../helpers/ConfigHelpers';
import swal from 'sweetalert2';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import UndoIcon from '@material-ui/icons/Undo';
import {withStyles} from '@material-ui/core/styles';

const styles = theme => ({
  sectionSpacer: {
    height: theme.spacing.unit,
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
    wordWrap: 'break-word',
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
    height: theme.spacing.unit * 4,
  },
  tdField: {
    // TODO Find a better way to prevent table from overflowing (x)
    maxWidth: '25vw',
    wordWrap: 'break-word',
  },
  tdExpanded: {
    borderBottom: 'none',
  },
  detailsTr: {
    height: 'auto',
  },
  detailsTd: {
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
    transition: theme.transitions.create('line-height', {
      easing: theme.transitions.easing.easeInOut,
      duration: theme.transitions.duration.shorter,
    }),
  },
  detailsTextHidden: {
    lineHeight: 0,
  },
});

type Props = {
  classes: Object,
  field: Array<string>,
  layers: Array<Object>,
  hasOverride: boolean,
  hasTopLevelOverride: boolean,
  metadata: Object,
  onDraftChange: Function, // (field[], value) => void
  onSelect: Function, // (field[]) => void
  isSelected: boolean,
  isVisible: boolean,
  colSpan: number,
};

type State = {
  localInputValue: string | number | boolean,
  localParsedInputValue: string | number | boolean | null,
  lazyInit: boolean,
};

class ConfigTableEntry extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    // Set the local input value (which will get saved as the draft value).
    // If there is no override, the actual draft value will initially be null,
    // but we initialize this field to a lower config layer for rendering.
    const {layers} = this.props;
    this.state = {
      localInputValue: this.getFieldValue(layers, ''),
      localParsedInputValue: null,

      // Don't render the details row until it's selected for the first time.
      // This won't trigger the opening animation the first time, but is a major
      // performance boost.
      lazyInit: false,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    // Lazy initialize the details row when selected
    return nextProps.isSelected && !prevState.lazyInit ? {lazyInit: true} : {};
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Optimization: only props that could change with same underlying config
    return (
      !shallowEqual(this.state, nextState) ||
      this.props.isVisible !== nextProps.isVisible ||
      this.props.hasOverride !== nextProps.hasOverride ||
      this.props.hasTopLevelOverride !== nextProps.hasTopLevelOverride ||
      this.props.isSelected !== nextProps.isSelected ||
      !isEqual(this.props.layers, nextProps.layers)
    );
  }

  componentDidUpdate(prevProps) {
    // If this row gets selected/unselected, reset the local input value
    // TODO move this somewhere else?
    if (prevProps.isSelected !== this.props.isSelected) {
      this.handleDiscardChanges();
    }
  }

  isOverrideDeleted(layers) {
    // Return whether the override value is deleted
    return (
      this.getDraftValue(layers) === null &&
      this.getOverrideValue(layers) !== null
    );
  }

  hasDraftValue(layers) {
    // Returns whether a draft value exists
    return this.getDraftValue(layers) !== this.getOverrideValue(layers);
  }

  getFieldValue(layers, defaultValue = null) {
    // Returns the field value, given all layers (in increasing order)
    // If the draft value is null, ignore the override value
    if (this.isOverrideDeleted(layers)) {
      return this.getUnderlyingValue(layers, defaultValue);
    }
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i].value !== null) {
        return layers[i].value;
      }
    }
    return defaultValue;
  }

  getOverrideValue(layers, defaultValue = null) {
    // Returns the override value, given all layers (in increasing order)
    if (layers.length < 2) {
      return defaultValue; // shouldn't happen
    }
    return layers[layers.length - 2].value;
  }

  getDraftValue(layers, defaultValue = null) {
    // Returns the draft value (*not* the local input value)
    const draftLayer = layers.find(layer => layer.id === ConfigLayer.DRAFT);
    return draftLayer ? draftLayer.value : defaultValue;
  }

  getUnderlyingValue(layers, defaultValue = null) {
    // Returns the underlying value (i.e. non-draft, non-override)
    if (layers.length < 3) {
      return defaultValue; // shouldn't happen
    }
    for (let i = layers.length - 3; i >= 0; i--) {
      if (layers[i].value !== null) {
        return layers[i].value;
      }
    }
    return defaultValue;
  }

  textClasses(...classList) {
    // Helper function to apply text classes (for transitions)
    const {classes, isSelected} = this.props;
    return classNames(
      ...classList,
      classes.detailsText,
      !isSelected && classes.detailsTextHidden,
    );
  }

  handleSave = () => {
    // Save the local input value as the draft value
    const {field, metadata, onDraftChange} = this.props;
    const {localInputValue, localParsedInputValue} = this.state;
    const value =
      localParsedInputValue === null ? localInputValue : localParsedInputValue;

    // Validate the field
    if (!validateField(value, metadata)) {
      swal({
        title: 'Error',
        text: 'That value is not allowed.',
        type: 'error',
      });
      return;
    }

    onDraftChange(field, value);
  };

  handleRemoveOverride = () => {
    // Remove the override value
    const {field, layers, onDraftChange} = this.props;

    onDraftChange(field, null);
    this.setState({
      localInputValue: this.getUnderlyingValue(layers, ''),
      localParsedInputValue: null,
    });
  };

  handleRestoreOverride = () => {
    // Restore the override value
    const {field, layers, onDraftChange} = this.props;

    onDraftChange(field, this.getOverrideValue(layers));
    this.setState({
      localInputValue: this.getOverrideValue(layers, ''),
      localParsedInputValue: null,
    });
  };

  handleDiscardChanges = () => {
    // Discard local input value changes
    const {layers} = this.props;

    this.setState({
      localInputValue: this.getFieldValue(layers, ''),
      localParsedInputValue: null,
    });
  };

  handleSelect = () => {
    // Handle selecting this row (i.e. toggling the expansion)
    const {field, onSelect} = this.props;
    onSelect(field);
  };

  handleInputChange = (value, parsedValue) => {
    // Handle an input field change
    this.setState({localInputValue: value, localParsedInputValue: parsedValue});
  };

  renderStatusIcons(layers) {
    // Render icons for override layers
    const {classes} = this.props;

    const iconProps = {classes: {root: classes.statusIcon}};
    return layers.map(({id}) => {
      const icon =
        id === ConfigLayer.AUTO_NODE ? (
          <AssistantIcon {...iconProps} />
        ) : id === ConfigLayer.NETWORK ? (
          <ScatterPlotIcon {...iconProps} />
        ) : id === ConfigLayer.NODE ? (
          getNodeIcon(iconProps)
        ) : id === ConfigLayer.DRAFT ? (
          <EditIcon {...iconProps} />
        ) : null;
      return icon ? (
        <Tooltip key={id} title={id}>
          {icon}
        </Tooltip>
      ) : null;
    });
  }

  renderOverrides(renderedLayers, deletedOverrideLayerId) {
    // Render the base layer and overrides (if any)
    const {classes} = this.props;

    return (
      <>
        <Typography
          variant="subtitle2"
          className={this.textClasses(classes.bold)}>
          Overrides
        </Typography>
        {renderedLayers.map(layer => (
          <Typography
            key={layer.id}
            className={this.textClasses(
              layer.id === deletedOverrideLayerId && classes.strikethrough,
            )}>
            <em>{layer.id}: </em>
            {layer.value !== null ? (
              String(layer.value)
            ) : (
              <span className={classes.red}>not set</span>
            )}
          </Typography>
        ))}
        <div className={classes.sectionSpacer} />
      </>
    );
  }

  renderInputActions() {
    // Render the actions (when selected)
    const {classes, layers, hasTopLevelOverride} = this.props;
    const {localInputValue} = this.state;
    const draftValueExists = this.hasDraftValue(layers);
    // NOTE: double equals (==) is intentional to handle string/int values
    const localEqualsDraft = localInputValue == this.getDraftValue(layers, '');
    const localEqualsField = localInputValue == this.getFieldValue(layers, '');

    const actions = [
      {
        text: 'Save',
        icon: <SaveIcon />,
        func: this.handleSave,
        enabled: !localEqualsDraft,
      },
      hasTopLevelOverride && this.isOverrideDeleted(layers)
        ? {
            text: 'Restore Override',
            icon: <RedoIcon />,
            func: this.handleRestoreOverride,
            enabled: hasTopLevelOverride,
          }
        : {
            text: 'Remove Override',
            icon: <UndoIcon />,
            func: this.handleRemoveOverride,
            enabled: hasTopLevelOverride || draftValueExists,
          },
      {
        text: 'Discard Changes',
        icon: <DeleteIcon />,
        func: this.handleDiscardChanges,
        enabled: !localEqualsDraft && !localEqualsField,
      },
    ];

    return (
      <List
        classes={{root: classes.list}}
        component="nav"
        dense
        onClick={ev => ev.stopPropagation()}>
        {actions.map(({text, icon, func, enabled}) => (
          <ListItem key={text} button dense disabled={!enabled} onClick={func}>
            <ListItemIcon classes={{root: classes.listItemIcon}}>
              {icon}
            </ListItemIcon>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
    );
  }

  render() {
    const {
      classes,
      field,
      layers,
      hasOverride,
      metadata,
      isSelected,
      isVisible,
      colSpan,
    } = this.props;
    const {localInputValue} = this.state;
    const {type, deprecated} = metadata;
    const fieldName = field.join(CONFIG_FIELD_DELIMITER);

    // Get the config value
    const value = this.getFieldValue(layers);
    const overrideValue = this.getOverrideValue(layers);
    const draftValueExists = this.hasDraftValue(layers);
    const deletedOverrideLayerId = this.isOverrideDeleted(layers)
      ? layers[layers.length - 2].id
      : null;

    // Determine which layers to display (when expanded)
    // Hide empty layers, and the draft layer if unchanged
    const renderedLayers = layers.filter(
      layer =>
        layer.id === ConfigLayer.BASE ||
        (layer.value !== null &&
          !(layer.id === ConfigLayer.DRAFT && layer.value === overrideValue)),
    );

    const mainTdProps = {
      className: classNames(
        isSelected && classes.tdExpanded,
        hasOverride && classes.bold,
      ),
      padding: 'dense',
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
    return (
      <React.Fragment key={field.join('\0')}>
        <TableRow
          className={classNames(classes.tr, !isVisible && classes.hidden)}
          hover={!isSelected}
          selected={isSelected}
          onClick={this.handleSelect}>
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
            {fieldName}
            {draftValueExists ? <span className={classes.red}> *</span> : null}
          </TableCell>
          <TableCell classes={{root: classes.noWrap}} {...mainTdProps}>
            {hasOverride ? 'modified ' : value !== null ? 'default' : 'unset'}
            {hasOverride && this.renderStatusIcons(renderedLayers)}
          </TableCell>
          <TableCell {...mainTdProps}>
            {type ? toTitleCase(type) : '?'}
          </TableCell>
          <TableCell classes={{root: classes.wrap}} {...mainTdProps}>
            {isSelected && !deprecated ? (
              <div onClick={ev => ev.stopPropagation()} role="none">
                <ConfigFormInput
                  metadata={metadata}
                  value={localInputValue}
                  onChange={this.handleInputChange}
                />
              </div>
            ) : value !== null ? (
              truncate(String(value), {length: 256})
            ) : null}
          </TableCell>
        </TableRow>

        {this.state.lazyInit ? (
          <TableRow
            className={classNames(
              classes.tr,
              classes.detailsTr,
              !isVisible && classes.hidden,
            )}
            selected={isSelected}
            onClick={this.handleSelect}>
            <TableCell {...detailsTdProps} colSpan={colSpan - 1}>
              <div {...detailsTdDivProps}>
                <ConfigMetadataBlock
                  metadata={metadata}
                  textClassName={this.textClasses()}
                />
                {renderedLayers.length > 1
                  ? this.renderOverrides(renderedLayers, deletedOverrideLayerId)
                  : null}
              </div>
            </TableCell>
            <TableCell {...detailsTdProps}>
              <div {...detailsTdDivProps}>
                {!deprecated ? this.renderInputActions() : null}
              </div>
            </TableCell>
          </TableRow>
        ) : null}
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(ConfigTableEntry);
