/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Navigation from 'overlib/client/navigation';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

export const CONTACTS_MASK = Util.objectMakeImmutable({
  _ids: {
    name: 1,
  },
});

interface ContactMember {
  accountID: AccountID;
  name: string;
  remove: (id: AccountID, name: string) => void;
}

interface ContactsContext {
  loaded: boolean;
  goBack: () => void;
  goToInvite: () => void;
  contactList: ContactMember[];
}

export class Contacts extends DataWatcher<{}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    loaded: Types.BOOL,
    goBack: Types.FUNCTION,
    goToInvite: Types.FUNCTION,
    contactList: ObjSchema.ARRAY_OF({
      accountID: Types.IDSTR,
      name: Types.STRING,
      remove: Types.FUNCTION,
    }),
  };

  removeContact = (contactID: AccountID, name: string) => {
    ReaderModal.openReaderModal({
      header: 'Are you sure you want to remove ' + name + ' as a friend?',
      showOK: true,
      okCaption: 'REMOVE',
      showCancel: true,
      onOK: () => {
        Sketch.runAction('contacts.removeContact', contactID);
      },
    });

  }

  render() {
    const contacts = this.getData(['contacts'], CONTACTS_MASK);
    const selfID = this.getData(['account', 'id']);
    const contactList : ContactMember[] = [];
    for (const _id in contacts) {
      const id = _id as AccountID;
      if (selfID === id) {
        continue;
      }
      contactList.push({
        accountID: id,
        name: contacts[id].name,
        remove: () => this.removeContact(id, contacts[id].name),
      });
    }

    const context : ContactsContext = {
      loaded: Boolean(Object.keys(contacts).length),
      goBack: () => Navigation.goBack(),
      goToInvite: () => Navigation.go(ReaderRoutes.inviteContacts0),
      contactList,
    };

    return <FixedTemplate template='Contacts' context={context}/>;
  }
}

registerContextSchema(module, 'Contacts', Contacts.contextSchema);
