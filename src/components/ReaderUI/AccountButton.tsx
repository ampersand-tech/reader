/**
 * Copyright 2016-present Ampersand Technologies, Inc.
 */

import * as React from 'react';
import * as PropTypes from 'prop-types';
import { UnstyledButton } from 'overlib/client/components/UnstyledButton';
import * as Util from 'overlib/client/clientUtil';


interface Props {
  style?: React.CSSProperties;
  command?: (e: object) => void;
  id?: string;
  classes?: string;
  disabled?: boolean;
  set?: boolean;
  defaultAction?: boolean;
  fgColor?: string;
  bgColor?: string;
  borderColor?: string;
}

export class AccountButton extends React.Component<Props, any> {
  static propTypes = {
    style: PropTypes.object,
    command: PropTypes.func,
    id: PropTypes.string,
    classes: PropTypes.string,
    disabled: PropTypes.bool,
    set: PropTypes.bool,
    defaultAction: PropTypes.bool,
    fgColor: PropTypes.string,
    bgColor: PropTypes.string,
    borderColor: PropTypes.string,
  };

  static defaultProps = {
    bgColor: 'white',
    fgColor: 'black',
    borderColor: 'fog',
  };

  render() {

    const validProps = Util.shallowClone(this.props) as Props;
    const layout = 'fs-18 w-200 fw-400 h-50 b-1 br-4 disabled:(op-.3)';

    const fg = 'c-' + this.props.fgColor;
    const bg = 'c-' + this.props.bgColor;
    const b = 'c-' + this.props.borderColor;

    const colors =
      bg + '-bg ' +
      fg + '-fg ' +
      b + '-b ' +
      'active:(' + bg + '-fg ' + fg + '-bg)';


    delete validProps.classes;
    delete validProps.fgColor;
    delete validProps.bgColor;
    delete validProps.borderColor;

    return (
      <UnstyledButton
        classes={Util.combineClasses(layout, colors, this.props.classes)}
        {...validProps as any}
      >
        {this.props.children}
      </UnstyledButton>
    );
  }
}
