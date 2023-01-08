/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as Modal from 'overlib/client/components/Modal.tsx';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface Props {
  closeModal: Function;
  skuTitle: string;
  skuSubtitle: string;
}

interface Context {
  closeModal: Function;
  skuTitle: string;
  skuSubtitle: string;
}

export class PostPurchaseModal extends React.Component<Props, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    closeModal: Types.FUNCTION,
    skuTitle: Types.STRING,
    skuSubtitle: Types.STRING,
  };

  static sampleContext: Stash = {
    closeModal: TEST_FUNC,
    skuTitle: 'MY AWESOME SKU',
    skuSubtitle: '10 Pack Bundle',
  };

  render() {
    const context: Context = {
      closeModal: this.props.closeModal,
      skuTitle: this.props.skuTitle,
      skuSubtitle: this.props.skuSubtitle,
    };
    return (
      <Modal.Wrapper
        key='wrapper'
        rootClasses='jc-fe'
        classes='b-0 pos-a left-0 right-0 bot-0'
        onBorderClick={() => {this.props.closeModal(); }}>
        <FixedTemplate template='PostPurchaseModal' context={context}/>
      </Modal.Wrapper>
    );
  }
}

registerContextSchema(module, 'PostPurchaseModal', PostPurchaseModal.contextSchema, PostPurchaseModal.sampleContext);
