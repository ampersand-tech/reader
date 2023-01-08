/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as Modal from 'overlib/client/components/Modal.tsx';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface Props {
  closeModal: Function;
}

export class ReaderLoadingModal extends React.Component<Props, {}> {
  static contextSchema: StashOf<Types.Schema> = {
  };

  static sampleContext: Stash = {
  };

  static propTypes = {
    closeModal: PropTypes.func.isRequired,
  };

  render() {
    const context = {
    };
    return (
      <Modal.Dialog
        classes='p-0 br-0 bxshdw-0-0-0-0-transparent c-transparent-bg'
        flexClasses='h-100%'
        hideHeader={true}>

        <FixedTemplate template='ReaderLoadingModal' context={context}/>
      </Modal.Dialog>
    );
  }
}

registerContextSchema(module, 'ReaderLoadingModal', ReaderLoadingModal.contextSchema, ReaderLoadingModal.sampleContext);
GlobalModal.registerGlobalModal(module, 'ReaderLoadingModal', ReaderLoadingModal);
