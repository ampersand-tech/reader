/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as Modal from 'overlib/client/components/Modal.tsx';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface InputField {
  id: string;
  name: string;
  testid?: string;
  setfocus?: boolean;
  value: string;
  type: string;
  nextID?: string;
  onTyping?: (text: string) => void;
}


interface ReaderInputModalProps {
  showOK?: boolean;
  okCaption?: string;

  showCancel?: boolean;
  cancelCaption?: string;
  inputFields: InputField[];
  header?: string;
  headerClasses?: string;
  text?: string;
  textClasses?: string;
  onOK?: () => void;
  onClose?: () => void;
}

interface FullProps extends ReaderInputModalProps {
  closeModal: Function;
}

interface ReaderInputModalContext {
  onOk: () => void;
  showOK: boolean;
  okCaption: string;

  onCancel: () => void;
  showCancel: boolean;
  cancelCaption: string;
  inputFields: InputField[];
  header: string;
  text: string;
  headerClasses: string;
  textClasses: string;
}

class ReaderInputModal extends React.Component<FullProps, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    showOK: Types.BOOL,
    okCaption: Types.STRING,
    showCancel: Types.BOOL,
    cancelCaption: Types.STRING,
    onOk: Types.FUNCTION,
    onCancel: Types.FUNCTION,
    header: Types.STRING,
    text: Types.STRING,
    headerClasses: Types.STRING,
    textClasses: Types.STRING,
    inputFields: ObjSchema.ARRAY_OF({
      id: Types.STRING,
      name: Types.STRING,
      testid: Types.STRING_NULLABLE,
      setfocus: Types.BOOL,
      value: Types.STRING,
      onTyping: Types.FUNCTION,
      type: Types.STRING,
      nextID: Types.STRING_NULLABLE,
    }),
  };

  static sampleContextSchema: Stash = {
    showOK: true,
    okCaption: 'testString',
    showCancel: true,
    cancelCaption: 'testString',
    onOk: TEST_FUNC,
    onCancel: TEST_FUNC,
    header: 'testString',
    text: 'testString',
    headerClasses: '',
    textClasses: '',
    inputFields: [{
      id: 'testString',
      name: 'testString',
      testid: 'testString',
      setfocus: true,
      value: 'testString',
      onTyping: TEST_FUNC,
      type: 'text',
      nextID: 'testString',
    }],
  };

  onCancel = () => {
    this.props.onClose && this.props.onClose();
    this.props.closeModal();
  }
  onOk = () => {
    this.props.onOK && this.props.onOK();
    this.props.closeModal();
  }
  render() {
    const context: ReaderInputModalContext = {
      onOk: this.onOk,
      okCaption: this.props.okCaption || 'ok',
      onCancel: this.onCancel,
      cancelCaption: this.props.cancelCaption || 'cancel',
      showOK: this.props.showOK || false,
      showCancel: this.props.showCancel || false,
      text: this.props.text || '',
      header: this.props.header || '',
      headerClasses: this.props.headerClasses || '',
      textClasses: this.props.textClasses || '',
      inputFields: this.props.inputFields,
    };
    return (
      <Modal.Dialog classes='c-white-bg w-90% w-x-400 h-x-450 br-10 p-0' onClose={this.onCancel} hideHeader={true}>
        <FixedTemplate template='ReaderInputModal' context={context}/>
      </Modal.Dialog>
    );
  }
}

registerContextSchema(module, 'ReaderInputModal', ReaderInputModal.contextSchema, ReaderInputModal.sampleContextSchema);
GlobalModal.registerGlobalModal(module, 'ReaderInputModal', ReaderInputModal);

export function openReaderInputModal(props: ReaderInputModalProps) {
  GlobalModal.openModal('ReaderInputModal', props);
}
