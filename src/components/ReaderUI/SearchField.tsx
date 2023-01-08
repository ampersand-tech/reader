/**
 * Copyright 2016-present Ampersand Technologies, Inc.
 */

import * as Util from 'overlib/client/clientUtil';
import * as Flex from 'overlib/client/components/Flex';
import { SvgIcon } from 'overlib/client/components/SvgIcon';
import { TextEntry, TextEntryProps } from 'overlib/client/components/TextEntry.tsx';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

interface Props {
  autoCapitalize?: string;
  autoComplete?: string;
  autoCorrect?: string;
  classes?: string;
  textEntryClasses?: string;
  className?: string;
  id?: string;
  invalid?: boolean;
  onTyping?: React.EventHandler<any>;
  placeholder?: string;
  setFocus?: boolean;
  focusBlurCB?: (focus: boolean) => void;
  testid?: string;
  useInvalidStyle?: boolean;
  value?: string;
  style?: React.CSSProperties;
}

interface SearchFieldState {
  focused: boolean;
}

export class SearchField extends React.Component<Props, SearchFieldState> {
  state : SearchFieldState = {
    focused: false,
  };

  textEntryParent: Node | null = null;

  recordTextEntryParent = (textentry : TextEntry) => {
    this.textEntryParent = ReactDOM.findDOMNode(textentry);
  }
  getValue = () : string => {
    return this.refs.textEntry && (this.refs as any).textEntry.getValue();
  }
  setFocus = () : void => {
    if (this.textEntryParent && this.textEntryParent instanceof HTMLElement) {
      this.textEntryParent.focus();
    }
  }
  click = (e) : void => {
    e.stopPropagation();
    this.setFocus();
    this.setState({focused: true});
    if (this.props.focusBlurCB) {this.props.focusBlurCB(true); }
  }
  setValue = (value: string) : void => {
    (this.refs as any).textEntry.setValue(value);
  }
  clear = () : void => {
    if (this.props.onTyping) {
      this.props.onTyping('');
    }
    this.setFocus();
  }
  cancel = () : void => {
    if (this.props.onTyping) {
      this.props.onTyping('');
    }
    this.setState({focused: false});
    if (this.props.focusBlurCB) {this.props.focusBlurCB(false); }
  }
  render() {
    const validProps = Util.shallowClone(this.props) as Props;
    const invalidStyle = (this.props.useInvalidStyle ? 'c-red-b focus:(c-red-b)' : ' b-2 c-#fff5b0-bg c-#FFC975-b');
    const textEntryClasses = Util.combineClasses(
      'fg-1 c-#333333-bg b-0 c-#d1d3d4-fg fs-14 fw-400',
      this.props.textEntryClasses,
      this.props.invalid ? invalidStyle : '',
    );

    const rootClasses = 'm-5';

    delete validProps.classes;
    delete validProps.textEntryClasses;
    delete validProps.useInvalidStyle;
    delete validProps.testid;

    const textEntryProps: TextEntryProps = validProps;


    return (
      <Flex.Row classes={Util.combineClasses(rootClasses, this.props.classes)}>
        <Flex.Row classes='br-13 c-#333333-bg ai-c p-y-8 fg-1' onClick={this.click}>
          <SvgIcon classes='m-l-15 m-r-5 c-#d1d3d4-f w-15 h-15' svgName='icons/icon_search.svg' />
          <TextEntry
            ref={this.recordTextEntryParent}
            testid={this.props.testid ? this.props.testid + '-textEntry' : undefined}
            className='SearchField'
            classes={textEntryClasses}
            allowNewlines={false}
            type='text'
            {...textEntryProps}
          />
          <Flex.Col classes='m-r-15 m-l-10 fw-700 c-#d1d3d4-fg jc-c' onClick={this.clear}>
            {(this.props.value !== '' ?
              <SvgIcon classes='c-#d1d3d4-f w-15 h-15' svgName='icons/icon_groups_x.svg' /> : null
            )}
          </Flex.Col>
        </Flex.Row>

        {(this.state.focused ?
            <Flex.Col classes='p-x-15 fw-500 fs-11 c-#d1d3d4-fg jc-c' onClick={this.cancel}>
              CANCEL
            </Flex.Col>
          : null
        )}
      </Flex.Row>
    );
  }
}
