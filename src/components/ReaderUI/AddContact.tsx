/**
 * Copyright 2016-present Ampersand Technologies, Inc.
 *
 */

import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex';
import { TextEntry } from 'overlib/client/components/TextEntry';
import { UnstyledButton } from 'overlib/client/components/UnstyledButton';
import * as Log from 'overlib/client/log';
import { Component, PROP_TYPE } from 'overlib/client/template/Component';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface AddContactProps {
  classes?: string;
}

interface AddContactState {
  email: string;
  errorMessage: string;
  invalidEmail: boolean;
}

export class AddContactReact extends DataWatcher<AddContactProps, AddContactState> {

  static propTypes = {
    classes: PropTypes.string,
  };

  state = {
    email: '',
    invalidEmail: false,
    errorMessage: '',
  };

  textEntry : TextEntry | null = null;

  emailChanged = (text: string) => {
    this.state.email = text;
    if (this.state.invalidEmail && Util.emailMatch(text)) {
      this.setState({invalidEmail: false});
    }
  }

  addContact = () => {
    const email = this.state.email;
    const accountID = this.getData(['account', 'id']);

    this.setState({errorMessage: ''});

    if (!accountID) {
      Log.error('@palmer', 'no user accountID. Cannot add contact.');
      return;
    }

    if (!email || !Util.emailMatch(email)) {
      this.setState({invalidEmail: true});
      return;
    }

    this.svrCmd('sendContactRequest', {email: email}, (err, _data) => {
      // TODO: show adding going on
      if (err) {
        this.setState({errorMessage: Util.errorToString(err, false)});
      } else {
        if (this.textEntry) {
          // text entry failed to do this normally, even with clearOnSubmit
          // and/or setting with value prop
          // TODO: investigate, fix, and remove this manual clear.
          this.textEntry.setValue('');
        }
        this.setState({email: '', errorMessage: ''});
      }
      return;
    });
  }

  render() {
    const invalidClasses = this.state.invalidEmail ? 'b-3 c-red-b c-rose-bg' : '';
    const textEntryClasses = Util.combineClasses('p-x-10 c-black-b b-1 br-8', invalidClasses);
    const classes = Util.combineClasses('m-t-15 m-b-18 c-pearl-fg', this.props.classes);
    return (
      <Flex.Col classes={classes}>
        <Flex.Row>
          <TextEntry
            ref={(te) => this.textEntry = te as TextEntry}
            classes={textEntryClasses}
            postChange={this.emailChanged}
            clearOnSubmit={true}
            submitCB={this.addContact}
          />
          <UnstyledButton classes='w-100 h-40 m-l-20 c-white-fg br-20 c-teal-bg' command={this.addContact}>ADD</UnstyledButton>
        </Flex.Row>
        <Flex.Row classes='h-20 c-red-fg'>{this.state.errorMessage}</Flex.Row>
      </Flex.Col>
    );
  }
}

export class AddContact extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(AddContactReact, props, content);
  }
}

