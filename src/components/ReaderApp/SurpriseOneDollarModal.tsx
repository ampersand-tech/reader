/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as Modal from 'overlib/client/components/Modal.tsx';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface Props {
  closeModal: Function;
  cb: Function;
}

export class SurpriseOneDollarModal extends React.Component<Props, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    onOk: Types.FUNCTION,
  };

  static sampleContext: Stash = {
    onOk: TEST_FUNC,
  };

  static propTypes = {
    closeModal: PropTypes.func.isRequired,
  };

  onOk = () => {
    this.props.cb();
    this.props.closeModal();
  }
  render() {
    const context = {
      onOk: this.onOk,
    };
    return (
      <Modal.Dialog classes='c-white-bg w-95% h-95% w-x-400 h-x-450 br-10 p-0' flexClasses='h-100%' onClose={this.onOk} hideHeader={true}>
        <FixedTemplate template='SurpriseOneDollarModal' context={context}/>
      </Modal.Dialog>
    );
  }
}

registerContextSchema(module, 'SurpriseOneDollarModal', SurpriseOneDollarModal.contextSchema, SurpriseOneDollarModal.sampleContext);
GlobalModal.registerGlobalModal(module, 'SurpriseOneDollarModal', SurpriseOneDollarModal);
