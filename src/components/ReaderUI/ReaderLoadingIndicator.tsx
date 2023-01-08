/**
* Copyright 2017-present Ampersand Technologies, Inc.
*
*/

import { LoadingIndicator } from 'overlib/client/components/LoadingIndicator';
import * as React from 'react';
import * as PropTypes from 'prop-types';

interface Props {
  drawDelay?: number;
  noFullSize?: boolean;
  classes?: string;
  light?: boolean;
  fadeIn?: number;
}

export class ReaderLoadingIndicator extends React.Component<Props, {}> {
  static propTypes = {
    drawDelay: PropTypes.number,
    noFullSize: PropTypes.bool,
    classes: PropTypes.string,
    light: PropTypes.bool,
    fadeIn: PropTypes.number,
  };

  static defaultProps = {
    fadeIn: 0.3,
  };

  render() {
    const classes = this.props.light ? '' : 'c-midnight-bg c-readerPrimaryDarkBG-f-fg';
    return <LoadingIndicator classes={classes} dark={!this.props.light} fadeIn={this.props.fadeIn}/>;
  }
}
