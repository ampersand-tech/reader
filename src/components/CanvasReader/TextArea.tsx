/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import * as Flex from 'overlib/client/components/Flex.tsx';
import { InputProps } from 'overlib/client/components/Layout/LayoutInput';
import { LayoutNode } from 'overlib/client/components/Layout/LayoutNode';
import * as Selection from 'overlib/client/components/Layout/Selection';
import { KeyCodes } from 'overlib/shared/keyCode';
import { ScreenSpacePoint } from 'overlib/shared/mathUtils';
import * as React from 'react';

interface Props {
  classes?: string;
}

interface State {
  text: string;
  selection: Selection.Selection;
  hasFocus: boolean;
}

function replaceText(text: string, start: number, end: number, newText: string) {
  return text.slice(0, start) + newText + text.slice(end);
}

export class TextArea extends React.Component<Props, State> {
  state = {
    text: '',
    selection: {
      start: 0,
      end: 0,
      atStart: false,
    },
    hasFocus: false,
  };

  private inputNode: LayoutNode | null;

  private setInput = (inputNode: any) => {
    this.inputNode = inputNode;
  }

  private getSelectedText = () => {
    return this.state.text.slice(this.state.selection.start, this.state.selection.end);
  }

  private deleteSelection = () => {
    const selStart = this.state.selection.start;
    const selEnd = this.state.selection.end;
    if (selStart === selEnd) {
      return;
    }

    this.setState({
      text: replaceText(this.state.text, selStart, selEnd, ''),
      selection: {
        start: selStart,
        end: selStart,
        atStart: false,
      },
    });
  }

  private onKeyPress = (e: KeyboardEvent) => {
    const textLen = this.state.text.length;
    let selStart = this.state.selection.start;
    let selEnd = this.state.selection.end;

    switch (e.which) {
      case KeyCodes.BACKSPACE:
        if (selStart === selEnd) {
          selStart = Math.max(selStart - 1, 0);
        }
        this.setState({
          text: replaceText(this.state.text, selStart, selEnd, ''),
          selection: {
            start: selStart,
            end: selStart,
            atStart: false,
          },
        });
        break;
      case KeyCodes.DELETE:
        if (selStart === selEnd) {
          selEnd = Math.max(selEnd + 1, textLen);
        }
        this.setState({
          text: replaceText(this.state.text, selStart, selEnd, ''),
          selection: {
            start: selStart,
            end: selStart,
            atStart: false,
          },
        });
        break;
      case KeyCodes.ESC:
        break;
      case KeyCodes.ENTER:
        break;
      case KeyCodes.TAB:
        break;
      case KeyCodes.PAGEUP:
        break;
      case KeyCodes.PAGEDOWN:
        break;
      case KeyCodes.HOME:
        this.setState({ selection: Selection.moveTo(this.state.selection, 0, textLen, e) });
        break;
      case KeyCodes.END:
        this.setState({ selection: Selection.moveTo(this.state.selection, textLen, textLen, e) });
        break;
      case KeyCodes.LEFTARROW:
        this.setState({ selection: Selection.moveBack(this.state.selection, textLen, e) });
        break;
      case KeyCodes.RIGHTARROW:
        this.setState({ selection: Selection.moveForward(this.state.selection, textLen, e) });
        break;
      case KeyCodes.UPARROW:
        break;
      case KeyCodes.DOWNARROW:
        break;
      default:
        const c = String.fromCharCode(e.charCode);
        if (c) {
          this.onPaste(c);
        }
        break;
    }
  }

  private onPaste = (pastedText: string) => {
    const selStart = this.state.selection.start;
    const selEnd = this.state.selection.end;
    this.setState({
      text: replaceText(this.state.text, selStart, selEnd, pastedText),
      selection: {
        start: selStart + pastedText.length,
        end: selStart + pastedText.length,
        atStart: false,
      },
    });
  }

  private onBlur = () => {
    this.setState({ hasFocus:  false });
  }

  private onClick = (_point: ScreenSpacePoint) => {
    if (this.inputNode && this.inputNode.input) {
      this.inputNode.input.setFocus();
      this.setState({ hasFocus:  true });
    }
  }

  private inputProps: InputProps = {
    getSelectedText: this.getSelectedText,
    deleteSelection: this.deleteSelection,
    onKeyPress: this.onKeyPress,
    onPaste: this.onPaste,
    //onKeyDown?: (e: KeyboardEvent) => void;
    //onKeyUp?: (e: KeyboardEvent) => void;
    onBlur: this.onBlur,
  };

  render() {
    return (
      <Flex.Col onClick={this.onClick} classes={this.props.classes}>
        <input classes='w-0 h-0' ref={this.setInput} data-input={this.inputProps} />
        <div key='text'>{this.state.text}</div>
      </Flex.Col>
    );
  }
}
