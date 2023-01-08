/**
 * Copyright 2016-present Ampersand Technologies, Inc.
 */

import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as Util from 'overlib/client/clientUtil';

import { UnstyledButton } from 'overlib/client/components/UnstyledButton';

interface Props {
  style?: React.CSSProperties;
  command?: (e: object) => void;
  id?: string;
  classes?: string;
  disabled?: boolean;
  set?: boolean;
  defaultAction?: boolean;
  warning?: boolean;
  colorOverride?: string;
  inverseColors?: boolean;
  testid?: string;
}

export class OnboardButton extends React.Component<Props, any> {
  static propTypes = {
    style: PropTypes.object,
    command: PropTypes.func,
    id: PropTypes.string,
    classes: PropTypes.string,
    disabled: PropTypes.bool,
    set: PropTypes.bool,
    defaultAction: PropTypes.bool,
    warning: PropTypes.bool,
    colorOverride: PropTypes.string,
    inverseColors: PropTypes.bool,
    testid: PropTypes.string,
  };

  render() {

    const validProps = Util.shallowClone(this.props) as Props;
    const layout = 'fs-18 w-204 h-54 b-1 br-27 fw-400';
    let colors = 'c-readerPrimary-bg c-white-fg c-white-b-a0.0 hover:(c-readerPrimary-b) ' +
      'active:(c-white-bg c-readerPrimary-fg c-readerPrimary-b) disabled:(op-.3)';

    if (this.props.inverseColors) {
      colors = 'b-2 c-readerPrimary-b c-transparent-bg c-readerPrimary-fg hover:(c-white-b) ' +
      'active:(c-readerPrimary-bg c-transparent-fg c-white-b) disabled:(op-.3)';
    }

    if (this.props.colorOverride) {
      colors = colors.replace(/readerPrimary/g, this.props.colorOverride);
    }

    delete validProps.classes;
    delete validProps.warning;
    delete validProps.colorOverride;
    delete validProps.inverseColors;
    delete validProps.testid;

    return (
      <UnstyledButton
        classes={Util.combineClasses(layout, colors, this.props.classes)}
        testid={this.props.testid ? this.props.testid + '-button' : undefined}
        {...validProps as any}
      >
        {this.props.children}
      </UnstyledButton>
    );
  }
}
