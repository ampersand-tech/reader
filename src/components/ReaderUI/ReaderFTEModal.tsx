/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as Modal from 'overlib/client/components/Modal.tsx';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface ReaderFTEModalProps {
  showOK?: boolean;
  okCaption?: string;

  showCancel?: boolean;
  cancelCaption?: string;

  header?: string;
  headerClasses?: string;
  text?: string;
  textClasses?: string;
  onOK?: () => void;
  img?: string;
  imgClasses?: string;
  gradTop?: string;
  gradBot?: string;
}

interface FullProps extends ReaderFTEModalProps {
  closeModal: Function;
}

interface ReaderFTEModalContext {
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
  img: string;
  imgClasses: string;
  gradTop: any;
  gradBot: any;
}

class ReaderFTEModal extends React.Component<FullProps, {}> {
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
    img: Types.STRING,
    imgClasses: Types.STRING,
    gradTop: Types.STRING,
    gradBot: Types.STRING,
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
    img: '',
    imgClasses: '',
    gradTop: '',
    gradBot: '',
  };

  onCancel = () => {
    this.props.closeModal();
  }
  onOk = () => {
    this.props.onOK && this.props.onOK();
    this.props.closeModal();
  }
  render() {
    const context: ReaderFTEModalContext = {
      onOk: this.onOk,
      okCaption: this.props.okCaption || 'GOT IT',
      onCancel: this.onCancel,
      cancelCaption: this.props.cancelCaption || 'cancel',
      showOK: this.props.showOK || false,
      showCancel: this.props.showCancel || false,
      text: this.props.text || '',
      header: this.props.header || '',
      headerClasses: this.props.headerClasses || '',
      textClasses: this.props.textClasses || '',
      img: this.props.img || '',
      imgClasses: this.props.imgClasses || '',
      gradTop: this.props.gradTop || '',
      gradBot: this.props.gradBot || '',
    };

    let style: React.CSSProperties = {};
    if (this.props.gradTop && this.props.gradBot) {
      style = {
        backgroundImage: `linear-gradient(${this.props.gradTop}, ${this.props.gradBot})`,
      };
    }

    return (
      <Modal.Dialog classes='w-295 h-425 br-10 p-0' onClose={this.onCancel} hideHeader={true} style={style}>
        <FixedTemplate template='ReaderFTEModal' context={context}/>
      </Modal.Dialog>
    );
  }
}

registerContextSchema(module, 'ReaderFTEModal', ReaderFTEModal.contextSchema, ReaderFTEModal.sampleContext);
GlobalModal.registerGlobalModal(module, 'ReaderFTEModal', ReaderFTEModal);

export function openModal(props: ReaderFTEModalProps) {
  GlobalModal.openModal('ReaderFTEModal', props);
}
