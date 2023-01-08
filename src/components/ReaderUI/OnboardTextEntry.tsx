/**
 * Copyright 2016-present Ampersand Technologies, Inc.
 */

import * as Util from 'overlib/client/clientUtil';
import * as Flex from 'overlib/client/components/Flex';
import { EntryType, TextEntry, TextEntryProps } from 'overlib/client/components/TextEntry.tsx';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface Props {
  allowNewlines?: boolean;
  autoCapitalize?: string;
  autoComplete?: string;
  autoCorrect?: string;
  autoFocus?: boolean;
  classes?: string;
  className?: string;
  filter?: (txt: string) => string;
  id?: string;
  invalid?: boolean;
  invalidMessage?: string;
  onBlurCB?: React.EventHandler<any>;
  onFocusCB?: React.EventHandler<any>;
  onPasteCB?: React.ClipboardEventHandler<any>;
  onTyping?: React.EventHandler<any>;
  pattern?: string;
  placeholder?: string;
  postChange?: (value: string) => void;
  setFocus?: boolean;
  submitCB?: (value: string) => void;
  testid?: string;
  type?: EntryType;
  useInvalidStyle?: boolean;
  value?: string;
  min?: string;
  max?: string;
  style?: React.CSSProperties;
}

export class OnboardTextEntry extends React.Component<Props, any> {
  static propTypes = {
    allowNewlines: PropTypes.bool,
    autoFocus: PropTypes.bool,
    autoCapitalize: PropTypes.string,
    autoComplete: PropTypes.string,
    autoCorrect: PropTypes.string,
    classes: PropTypes.string,
    className: PropTypes.string,
    filter: PropTypes.func,
    id: PropTypes.string,
    invalid: PropTypes.bool,
    invalidMessage: PropTypes.string,
    onBlurCB: PropTypes.func,
    onFocusCB: PropTypes.func,
    onPasteCB: PropTypes.func,
    onTyping: PropTypes.func,
    pattern: PropTypes.string,
    placeholder: PropTypes.string,
    postChange: PropTypes.func,
    setFocus: PropTypes.bool,
    submitCB: PropTypes.func,
    testid: PropTypes.string,
    type: PropTypes.string,
    useInvalidStyle: PropTypes.bool,
    value: PropTypes.string,
    min: PropTypes.string,
    max: PropTypes.string,
    style: PropTypes.object,
  };

  getValue = () : string => {
    return this.refs.textEntry && (this.refs as any).textEntry.getValue();
  }
  setFocus = () : void => {
    (this.refs as any).textEntry.setFocus();
  }
  click = (e) : void => {
    e.stopPropagation();
  }
  setValue = (value: string) : void => {
    (this.refs as any).textEntry.setValue(value);
  }
  render() {
    const validProps = Util.shallowClone(this.props) as Props;
    const classes = 'p-x-10 p-y-5 flx-0-0-a w-100% h-40 c-white-bg c-smoke-fg fs-20 fw-300 b-1';

    delete validProps.classes;
    delete validProps.invalid;
    delete validProps.invalidMessage;
    delete validProps.useInvalidStyle;
    delete validProps.testid;

    const textEntryProps: TextEntryProps = validProps;

    const triangleStyle = {
      width: '0',
      height: '0',
      borderStyle: 'solid',
      borderWidth: '0 10px 10px 10px',
      borderColor: 'transparent transparent rgba(0,0,0,.7) transparent',
    };
    const invalidStyle = (this.props.useInvalidStyle ? 'c-red-b focus:(c-red-b)' : ' b-2 c-#fff5b0-bg c-#FFC975-b');
    return (
      <Flex.Col classes='flx-1-0-a ai-c w-100%' onClick={this.click}>
        <TextEntry
          ref='textEntry'
          testid={this.props.testid ? this.props.testid + '-textEntry' : undefined}
          className='onboardTextEntry'
          classes={Util.combineClasses(classes, this.props.classes, this.props.invalid ? invalidStyle : '')}
          clearOnSubmit={false}
          {...textEntryProps}
        />
        {(this.props.invalid ?
          <Flex.Row classes='pos-r w-100%'>
            <Flex.Col classes='pos-a fg-1 m-t-5 ai-c'>
              <Flex.Row style={triangleStyle}/>
              <Flex.Row classes='w-250 ta-c jc-c c-white-fg fs-14 fw-400 p-y-5 br-5 c-black-bg-a.7 p-5 p-x-15'>
                {this.props.invalidMessage || 'invalid entry'}
              </Flex.Row>
            </Flex.Col>
          </Flex.Row> : null
        )}
      </Flex.Col>
    );
  }
}
