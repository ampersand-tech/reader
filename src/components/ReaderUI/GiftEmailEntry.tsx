/**
 * Copyright 2015-present Ampersand Technologies, Inc.
 *
 */

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as DataStore from 'overlib/shared/dataStore';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

export interface GiftEmailEntryPublicProps {
  sendGift: (
    gifteeEmail: string,
    gifteeName: string,
    gifterName: string,
    updateError: (message: string) => void,
    closeModal: () => void,
  ) => void;
}

interface GiftEmailEntryProps {
  closeModal: () => void; // added by global modal handlers
  sendGift: (
    gifteeEmail: string,
    gifteeName: string,
    gifterName: string,
    updateError: (message: string) => void,
    closeModal: () => void,
  ) => void;
}

interface GiftEmailEntryContext {
  closeModal: () => void;
  email: string;
  emailValid: boolean;
  errorMessage: string;
  gifteeName: string;
  gifterName: string;
  sendGift: () => void;
  updateEmail: (email: string) => void;
  updateGifteeName: (email: string) => void;
  updateGifterName: (email: string) => void;
}

interface GiftEmailEntryState {
  email: string;
  errorMessage: string;
  gifteeName: string;
  gifterName: string;
}

export class GiftEmailEntry extends DataWatcher<GiftEmailEntryProps, GiftEmailEntryState> {

  static contextSchema: StashOf<Types.Schema> = {
    closeModal: Types.FUNCTION,
    email: Types.STRING,
    emailValid: Types.BOOL,
    errorMessage: Types.STRING,
    gifteeName: Types.STRING,
    gifterName: Types.STRING,
    sendGift: Types.FUNCTION,
    updateEmail: Types.FUNCTION,
    updateGifteeName: Types.FUNCTION,
    updateGifterName: Types.FUNCTION,
  };

  static sampleContext: Stash = {
    closeModal: TEST_FUNC,
    email: 'mail@example.com',
    emailValid: true,
    errorMessage: '',
    gifteeName: 'Giftee',
    gifterName: 'Gifter',
    sendGift: TEST_FUNC,
    updateEmail: TEST_FUNC,
    updateGifteeName: TEST_FUNC,
    updateGifterName: TEST_FUNC,
  };

  state: GiftEmailEntryState = {
    email: '',
    errorMessage: '',
    gifteeName: '',
    gifterName: DataStore.getData(null, ['account', 'name']) || '',
  };

  validEmail = () => {
    return !!this.state.email && Util.emailMatch(this.state.email);
  }

  sendGift = () => {
    if (!this.validEmail()) { return; }
    this.props.sendGift(this.state.email, this.state.gifteeName, this.state.gifterName,
      this.updateErrorMessage, this.props.closeModal);
  }

  updateEmail = (email: string) => {
    this.setState({email});
  }

  updateErrorMessage = (message: string) => {
    this.setState({errorMessage: message});
  }

  updateGifteeName = (gifteeName: string) => {
    this.setState({gifteeName});
  }

  updateGifterName = (gifterName: string) => {
    this.setState({gifterName});
  }

  render() {
    const context : GiftEmailEntryContext = {
      closeModal: this.props.closeModal,
      email: this.state.email,
      emailValid: this.validEmail(),
      errorMessage: this.state.errorMessage,
      gifteeName: this.state.gifteeName,
      gifterName: this.state.gifterName,
      sendGift: this.sendGift,
      updateEmail: this.updateEmail,
      updateGifteeName: this.updateGifteeName,
      updateGifterName: this.updateGifterName,
    };

    return (
      <FixedTemplate template='GiftEmailEntry' context={context} />
    );
  }
}

registerContextSchema(module, 'GiftEmailEntry', GiftEmailEntry.contextSchema, GiftEmailEntry.sampleContext);

GlobalModal.registerGlobalModal(module, 'GiftEmailEntry', GiftEmailEntry);
