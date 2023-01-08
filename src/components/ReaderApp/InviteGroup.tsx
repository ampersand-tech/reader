/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { CONTACTS_MASK } from 'clientjs/components/ReaderApp/Contacts.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import * as GroupUtils from 'clientjs/groupUtils';
import * as Metrics from 'clientjs/metrics';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as AlertsDB from 'clientjs/shared/alertsDB';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as DataStore from 'overlib/shared/dataStore';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const MEMBERS_MASK = Util.objectMakeImmutable({
  _ids: {},
});

interface ContactMember {
  accountID: AccountID;
  name: string;
  alreadyInvited: boolean;
  clickFunc: () => void;
}

interface InviteGroupContext {
  closeEmailDialog: () => void;
  contactList: StashOf<ContactMember>;
  emailValid: boolean;
  goBack: () => void;
  goToInviteContacts: () => void;
  groupID: string | null;
  openEmailDialog: () => void;
  sendInvite: () => void;
  showEmailDialog: boolean;
  updateEmail: (email: string) => void;
  updateInviteeName: (inviteeName: string) => void;
  updateInviterName: (inviterName: string) => void;
  inviterName: string;
  inviteeName: string;
  email: string;
  tshirtSuccess: boolean;
  dismissTshirt: () => void;
  followTshirt: () => void;
}

interface InviteGroupProps {
  bookID: Constants.BookID;
  groupID: Constants.ReactionGroupID;
}

interface InviteGroupState {
  contactList: StashOf<ContactMember>;
  email: string;
  inviteeName: string;
  inviterName: string;
  fromPhoneContacts: boolean;
  showEmailDialog: boolean;
  tshirtSuccess: boolean;
}

export class InviteGroup extends DataWatcher<InviteGroupProps, InviteGroupState> {

  static propTypes = {
    bookID: PropTypes.string,
    groupID: PropTypes.string,
  };

  static contextSchema: StashOf<Types.Schema> = {
    closeEmailDialog: Types.FUNCTION,
    contactList: ObjSchema.MAP({
      accountID: Types.ACCOUNTIDSTR,
      name: Types.STRING,
      alreadyInvited: Types.BOOL,
      clickFunc: Types.FUNCTION,
    }),
    emailValid: Types.BOOL,
    goBack: Types.FUNCTION,
    goToInviteContacts: Types.FUNCTION,
    groupID: Types.STRING_NULLABLE,
    openEmailDialog: Types.FUNCTION,
    sendInvite: Types.FUNCTION,
    showEmailDialog: Types.BOOL,
    updateEmail: Types.FUNCTION,
    updateInviteeName: Types.FUNCTION,
    updateInviterName: Types.FUNCTION,
    inviterName: Types.STRING,
    inviteeName: Types.STRING,
    email: Types.STRING,
    tshirtSuccess: Types.BOOL,
    dismissTshirt: Types.FUNCTION,
    followTshirt: Types.FUNCTION,
  };

  state: InviteGroupState = {
    contactList: {},
    email: '',
    inviteeName: '',
    inviterName: DataStore.getData(null, ['account', 'name']),
    showEmailDialog: false,
    fromPhoneContacts: false,
    tshirtSuccess: false,
  };

  componentDidMount() {
    this.buildContactList();
  }

  openAddDialog = (addMemberID: AccountID) => {
    ReaderModal.openReaderModal({
      header: 'Do you want to add this person to the group?',
      showOK: true,
      okCaption: 'YES',
      showCancel: true,
      onOK: () => this.addMember(addMemberID),
    });
  }

  openEmailDialog = () => {
    this.setState({
      showEmailDialog: true,
    });
  }

  closeEmailDialog = () => {
    this.clearAndReturnToContacts();
  }

  clearAndReturnToContacts = () => {
    this.setState(
      {
        showEmailDialog: false,
        fromPhoneContacts: false,
        email: '',
        inviteeName: '',
      });
  }

  updateEmail = (email: string) => {
    this.setState({email});
  }

  updateInviteeName = (inviteeName: string) => {
    this.setState({inviteeName});
  }

  updateInviterName = (inviterName: string) => {
    this.setState({inviterName});
  }

  getMetricsBookID = () => {
    return Constants.extractContentID(this.props.bookID);
  }

  addMember = (addMemberID: AccountID) => {
    this.markAsAdded(addMemberID);
    const channelID = this.getData(['reactionGroup2', this.props.groupID, 'channelID']);
    const bookID = this.getMetricsBookID();
    this.svrCmd('sendReaderInviteByID', {inviteeID: addMemberID, reactionGroupID: this.props.groupID, bookID: this.props.bookID},
      (err, _data) => {
        if (err) {
          Log.warn('@palmer', err);
          return;
        }

        Metrics.recordInSet(Metrics.SET.READER.APP, 'invitedGroups', {
          inviteeID: addMemberID,
          reactionGroupID: this.props.groupID,
          channelID,
          bookID,
          fromPhoneContacts: false,
        });
      });
  }
  tShirtCounter = () => { // Tshirt hack
    const currentInvites = this.getData(['settingsGlobal', 'reader', 'FTE', 'tShirtPromoCount']);
    if (Number.isInteger(currentInvites)) {
      if (currentInvites === 4) { // they are inviting their 5th now
        const TShirtPromoAlert = {
          type: 'promotion',
          modTime: Date.now(),
          extraData: {
            contentID: Constants.TSHIRT_SUCCESS,
          },
        } as AlertsDB.Alert;
        Sketch.runAction('alerts.insertPromotion', TShirtPromoAlert);
        this.setState({tshirtSuccess: true});
      }
      Sketch.runAction('settingsGlobal.set', 'reader', {FTE : {
        tShirtPromoCount: currentInvites + 1,
      }});
    }
  }

  dismissTshirt = () => {
    this.setState({tshirtSuccess: false});
  }

  followTshirt = () => {
    Navigation.openExternalURL('http://www.ampersand.com/ttpromo');
  }

  sendInvite = () => {
    if (!GroupUtils.canSendInvite(this.props.groupID)) {
      this.clearAndReturnToContacts();
      return;
    }

    this.clearAndReturnToContacts();
    this.tShirtCounter();

    const email = this.state.email;
    const groupID = this.props.groupID;
    const inviteeName = this.state.inviteeName;
    const inviterName = this.state.inviterName;
    const fromPhoneContacts = this.state.fromPhoneContacts;

    let channelID;
    if (groupID) {
      channelID = this.getData(['reactionGroup2', groupID, 'channelID']);
    }
    const bookID = this.getMetricsBookID(); // note: this is not a bookID

    this.svrCmd('sendReaderInvite', {email, inviteeName, inviterName, reactionGroupID: groupID, bookID: this.props.bookID}, (err) => {
      if (err) {
        Log.warn('@conor', 'failed to invite reader', err);
        Sketch.runAction('reactionGroup2.removePendingInvite', groupID, email);
        return;
      }
      Metrics.recordInSet(Metrics.SET.READER.APP, 'invitedGroups', {
        email: email,
        reactionGroupID: groupID,
        channelID,
        bookID,
        fromPhoneContacts,
      });
    });
  }

  fillOutInviteInfo = (name: string, email: string) => {
    this.setState({
      showEmailDialog: true,
      email: email,
      inviteeName: name,
      fromPhoneContacts: true,
    });
  }

  buildContactList = () => {
    const contactList : StashOf<ContactMember> = {};
    const contacts = this.getData(['contacts'], CONTACTS_MASK);
    const selfID = this.getData(['account', 'id']);
    const members = this.getData(['reactionGroup2', this.props.groupID, 'members'], MEMBERS_MASK);

    for (const _id in contacts) {
      const id = _id as AccountID;
      if (selfID === id) {
        continue;
      }
      contactList[id] = {
        accountID: id,
        name: contacts[id].name,
        alreadyInvited: Boolean(members[id]),
        clickFunc: () => this.openAddDialog(id),
      };
    }
    this.setState({contactList});
  }

  markAsAdded = (addedID: AccountID) => {
    let contactList = Util.clone(this.state.contactList);
    contactList[addedID].alreadyInvited = Boolean(contactList[addedID]);
    this.setState({contactList});
  }

  render() {
    const context : InviteGroupContext = {
      closeEmailDialog: this.closeEmailDialog,
      contactList: this.state.contactList,
      emailValid: Boolean(this.state.email) && Util.emailMatch(this.state.email),
      goBack: () => Navigation.goBack(),
      groupID: this.props.groupID || null,
      openEmailDialog: this.openEmailDialog,
      sendInvite: this.sendInvite,
      showEmailDialog: this.state.showEmailDialog,
      goToInviteContacts: () => Navigation.go(ReaderRoutes.inviteContacts2(this.props.groupID, this.props.bookID)),
      updateEmail: this.updateEmail,
      updateInviteeName: this.updateInviteeName,
      updateInviterName: this.updateInviterName,
      email: this.state.email,
      inviteeName: this.state.inviteeName,
      inviterName: this.state.inviterName,
      tshirtSuccess: this.state.tshirtSuccess,
      dismissTshirt: () => this.dismissTshirt(),
      followTshirt: this.followTshirt,
    };

    return (
      <FixedTemplate template='InviteGroup' context={context} />
    );
  }
}

registerContextSchema(module, 'InviteGroup', InviteGroup.contextSchema);
