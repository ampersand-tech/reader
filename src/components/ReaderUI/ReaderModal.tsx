/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as Modal from 'overlib/client/components/Modal.tsx';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface ReaderModalProps {
  showOK?: boolean;
  okCaption?: string;

  showCancel?: boolean;
  cancelCaption?: string;

  header?: string;
  headerClasses?: string;
  text?: string;
  textClasses?: string;
  onOK?: () => void;
}

interface FullProps extends ReaderModalProps {
  closeModal: Function;
}

interface ReaderModalContext {
  onOk: () => void;
  showOK: boolean;
  okCaption: string;

  onCancel: () => void;
  showCancel: boolean;
  cancelCaption: string;

  header: string;
  text: string;
  headerClasses: string;
  textClasses: string;
}

class ReaderModal extends React.Component<FullProps, {}> {
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
  };

  static sampleContext: Stash = {
    onOk: TEST_FUNC,
    okCaption: 'ok',
    onCancel: TEST_FUNC,
    cancelCaption: 'cancel',
    showOK: true,
    showCancel: true,
    header: 'The Header',
    text: 'The body.',
    headerClasses: '',
    textClasses: 'ta-c',

  };

  onCancel = () => {
    this.props.closeModal();
  }
  onOk = () => {
    this.props.onOK && this.props.onOK();
    this.props.closeModal();
  }
  render() {
    const context: ReaderModalContext = {
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
    };
    return (
      <Modal.Dialog classes='c-white-bg w-90% w-x-400 h-x-450 br-10 p-0' onClose={this.onCancel} hideHeader={true}>
        <FixedTemplate template='ReaderModal' context={context}/>
      </Modal.Dialog>
    );
  }
}

registerContextSchema(module, 'ReaderModal', ReaderModal.contextSchema, ReaderModal.sampleContext);
GlobalModal.registerGlobalModal(module, 'ReaderModal', ReaderModal);

export function openReaderModal(props: ReaderModalProps) {
  GlobalModal.openModal('ReaderModal', props);
}
