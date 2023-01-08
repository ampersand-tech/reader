/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { CONTACTS_MASK } from 'clientjs/components/ReaderApp/Contacts.tsx';
import * as ReaderInputModal from 'clientjs/components/ReaderUI/ReaderInputModal.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import * as GroupUtils from 'clientjs/groupUtils';
import * as Metrics from 'clientjs/metrics';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as AlertsDB from 'clientjs/shared/alertsDB';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as IpcUtil from 'overlib/client/ipcClientUtil';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as DataStore from 'overlib/shared/dataStore';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface ContactMember {
  alreadyInvited: boolean;
  clickFunc: () => void;
  contactInfo: string;
  source: string;
  accountID?: AccountID;
  name: string;
}

interface Connection {
  name: string;
  clickFunc: () => void;
  connected: boolean;
}

interface InviteContactsContext {
  potentialContactList: ContactMember[];
  peopleList: ContactMember[];
  connections: Connection[];
  goBack: () => void;
  searchText: string;
  handleSearch: (term: string) => void;
  emailInvite: () => void;
  tshirtSuccess: boolean;
  dismissTshirt: () => void;
  followTshirt: () => void;
}

interface InviteContactsProps {
  groupID?: Constants.ReactionGroupID;
  bookID?: Constants.BookID;
}

interface InviteContactsState {
  connections: Connection[];
  phoneContactList: ContactMember[];
  userName: string;
  inviteeName: string;
  inviteeEmail: string;
  searchText: string;
  potentialContactList: ContactMember[];
  peopleList: ContactMember[];
  invitedOnServer: StashOf<boolean>;
  invitedThisSession: StashOf<boolean>;
  tshirtSuccess: boolean;
}

export class InviteContacts extends DataWatcher<InviteContactsProps, InviteContactsState> {
  static contextSchema: StashOf<Types.Schema> = {
    potentialContactList: ObjSchema.ARRAY_OF({
      alreadyInvited: Types.BOOL,
      clickFunc: Types.FUNCTION,
      contactInfo: Types.STRING,
      source: Types.STRING,
      accountID: Types.STRING_NULLABLE,
      name: Types.STRING,
    }),
    peopleList: ObjSchema.ARRAY_OF({
      alreadyInvited: Types.BOOL,
      clickFunc: Types.FUNCTION,
      contactInfo: Types.STRING,
      source: Types.STRING,
      accountID: Types.STRING_NULLABLE,
      name: Types.STRING,
    }),
    connections: ObjSchema.ARRAY_OF({
      name: Types.STRING,
      clickFunc: Types.FUNCTION,
      connected: Types.BOOL,
    }),
    goBack: Types.FUNCTION,
    searchText: Types.STRING,
    handleSearch: Types.FUNCTION,
    emailInvite: Types.FUNCTION,
    tshirtSuccess: Types.BOOL,
    dismissTshirt: Types.FUNCTION,
    followTshirt: Types.FUNCTION,
  };

  state: InviteContactsState = {
    connections: [
      {name: 'Contacts', clickFunc: () => this.checkPhoneContactsAccess(), connected: false},
      {name: 'Facebook', clickFunc: () => {}, connected: false},
      {name: 'Google', clickFunc: () => {}, connected: false},
    ],
    phoneContactList: [],
    userName: DataStore.getData(null, ['account', 'name']),
    inviteeName: '',
    inviteeEmail: '',
    searchText: '',
    potentialContactList: [],
    peopleList: [],
    invitedOnServer: {},
    invitedThisSession: {},
    tshirtSuccess: false,
  };

  componentDidMount() {
    const connectionStatus : Connection[] = [];
    if (IpcUtil.isMobileClient()) {
      IpcUtil.sendCommand('contactsAccessStatus', {}, (err, resp) => {
        if (err) {
          Log.error('@palmer', 'Error checking contacts access status');
        }
        if (resp['access'] === Constants.CONTACTS_ACCESS_STATUS.AUTHORIZED) {
          connectionStatus.push({name: 'Contacts', clickFunc: () => this.loadPhoneContactsInfo(), connected: true});
          this.loadPhoneContactsInfo();
        } else {
          connectionStatus.push({name: 'Contacts', clickFunc: () => this.checkPhoneContactsAccess(), connected: false});
        }
      });
      this.setState({connections: connectionStatus});
    } else if (process.env.NODE_ENV === 'development') {
      connectionStatus.push({name: 'Contacts', clickFunc: () => this.loadPhoneContactsInfo(), connected: true});
      this.setState({connections: connectionStatus});
      this.loadPhoneContactsInfo();
    }
    const invitedOnServer = this.getServerData('getPendingInvites', {});
    this.setState({invitedOnServer});
  }

  getPhoneContactsInfo(cb) {
    if (IpcUtil.isMobileClient()) {
      return IpcUtil.sendCommand('getContactsInfo', {type: 'email'}, cb);
    } else if (process.env.NODE_ENV === 'development') {
      const sampleContacts = [
        {email: 'test+johnny@ampersand.com', name: 'Johnny Appleseed'},
        {email: 'test@ampersand.com', name: 'Test Person'},
        {email: 'test+roger@ampersand.com', name: 'Roger Alfans'},
        {email: 'test+chris@ampersand.com', name: 'Chris Tanger'},
        {email: 'test+pete@ampersand.com', name: 'Pete Peterson'},
      ];

      return cb(null, {contacts: sampleContacts});
    }
  }

  loadPhoneContactsInfo = () => {
    this.getPhoneContactsInfo((err, res: {contacts: {email: string, name: string}[]}) => {
      if (err) {
        Log.error('@palmer', 'error fetching email contacts');
        return;
      }
      // TODO: handle error
      const resultList = Util.clone(res['contacts']);
      this.buildContactList(resultList);
    });
  }

  checkPhoneContactsAccess = () => {
      if (IpcUtil.isMobileClient()) {
        IpcUtil.sendCommand('contactsAccessStatus', {}, (err, resp) => {
          if (err) {
            Log.error('@palmer', 'Error checking contacts access status');
            return;
          }
          if (!resp) {
            Log.error('@palmer', 'No response to contacts access status');
            return;
          }

          if (resp['access'] === Constants.CONTACTS_ACCESS_STATUS.AUTHORIZED) {
            this.loadPhoneContactsInfo();
          } else if (resp['access'] === Constants.CONTACTS_ACCESS_STATUS.DENIED) {
            Navigation.go(ReaderRoutes.noContactsAccess);
          } else {
            ReaderModal.openReaderModal({
              header: 'Allow Ampersand to access your contacts?',
              text: 'This lets you choose which friends to invite to your reading group.',
              showOK: true,
              okCaption: 'ALLOW',
              showCancel: true,
              cancelCaption: 'MAYBE LATER',
              onOK: () => this.requestPhoneContactsAccess(),
            });
          }
          return;
        });
      } else if (process.env.NODE_ENV === 'development') {
        this.loadPhoneContactsInfo();
      }
  }

  requestPhoneContactsAccess = () => {
    IpcUtil.sendCommand('requestContactsAccess', {}, (err, resp) => {
      if (err) {
        Log.error('@palmer', 'Error checking request contacts');
        return;
      }
      if (!resp) {
        Log.error('@palmer', 'No response to request contacts access');
        return;
      }

      if (resp['access'] === Constants.CONTACTS_ACCESS_STATUS.AUTHORIZED) {
        this.loadPhoneContactsInfo();
      } else {
        Navigation.go(ReaderRoutes.noContactsAccess);
      }
      return;
    });
  }

  markPotentialAsAdded = (addedID: AccountID) => {
    let potentialContactList = Util.clone(this.state.potentialContactList);
    for (let contact = 0; contact < potentialContactList.length; contact++) {
      if (potentialContactList[contact].accountID && potentialContactList[contact].accountID === addedID ) {
        potentialContactList[contact].alreadyInvited = true;
      }
    }
    this.setState({potentialContactList});
  }

  buildContactList = (contacts: {email: string, name: string}[]) => {
    const phoneContactList: ContactMember[] = [];
    let potentialContactList : ContactMember[] = [];
    const existingContacts = this.getData(['contacts'], CONTACTS_MASK);

    let emails: string[] = [];
    for (const contact of contacts) {
      const email = Constants.normalizeEmail(contact.email);
      emails.push(email);
    }
    this.svrCmd('findAccountsByEmail', {emails}, (err, accounts) => {
      if (err) {
        Log.error('@skylar', 'Error finding accounts by email');
        return;
      }
      for (const email in accounts) {
        if (existingContacts && !existingContacts[accounts[email].id]) {
          const newContact: ContactMember = {
            alreadyInvited: false,
            clickFunc: () => {this.openAddDialog(accounts[email].id); },
            accountID: accounts[email].id,
            source: 'already on Ampersand',
            contactInfo: email,
            name: accounts[email].name,
          };
          potentialContactList.push(newContact);
        }
      }
    });

    for (const contact of contacts) {
      const email = Constants.normalizeEmail(contact.email);
      const newContact: ContactMember = {
        alreadyInvited: false,
        clickFunc: () => {this.openContactInfo(contact.name, email); },
        accountID: '' as AccountID,
        source: 'Address Book Contact',
        contactInfo: email,
        name: contact.name,
      };
      phoneContactList.push(newContact);
    }

    potentialContactList.sort((a, b) => Util.cmpStringOrUndefined(false, false, false, a.name, b.name));
    phoneContactList.sort((a, b) => Util.cmpStringOrUndefined(false, false, false, a.name, b.name));

    this.setState({ phoneContactList, potentialContactList});
  }

  openContactInfo = (name?: string, email?: string) => {
    if (name && email) {
      this.setState({inviteeName: name, inviteeEmail: email}, () => {
        this.openContactInfoModal();
      });
    } else {
      this.openContactInfoModal();
    }
  }

  openContactInfoModal = () => {
    ReaderInputModal.openReaderInputModal({
      header: 'Invite from Email',
      inputFields: [{
        id: 'userName',
        name: 'MY NAME',
        testid: 'userName',
        setfocus: false,
        value: this.state.userName,
        type: 'text',
        nextID: 'friendName',
        onTyping: (text: string) => {this.setState({userName: text}); },
      },
      {
        id: 'inviteeName',
        name: 'FRIEND\'S NAME',
        testid: 'inviteeName',
        setfocus: true,
        value: this.state.inviteeName,
        type: 'text',
        nextID: 'inviteeEmail',
        onTyping: (text: string) => {this.setState({inviteeName: text}); },
      },
      {
        id: 'inviteeEmail',
        name: 'FRIEND\'S EMAIL',
        testid: 'inviteeEmail',
        setfocus: false,
        value: this.state.inviteeEmail,
        type: 'email',
        nextID: 'userName',
        onTyping: (text: string) => {this.setState({inviteeEmail: text}); },
      }],
      showOK: true,
      okCaption: 'SEND',
      showCancel: true,
      cancelCaption: 'CANCEL',
      onOK: () => this.sendInvite(),
      onClose: () => this.clearInputs(),
    });
  }

  getMetricsBookID = (): Constants.ContentItemID | undefined => {
    if (!this.props.bookID) {
      return;
    }
    return Constants.extractContentID(this.props.bookID);
  }

  sendInvite = () => {
    if (this.props.groupID && !GroupUtils.canSendInvite(this.props.groupID)) {
      this.clearInputs();
      return;
    }

    this.addToInvited();
    this.tShirtCounter();

    const email = this.state.inviteeEmail;
    const groupID = this.props.groupID;
    const inviteeName = this.state.inviteeName;
    const inviterName = this.getData(['account', 'name']);
    const fromPhoneContacts = true; // this is true for all cases now

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
    this.clearInputs();
  }

  addToInvited = () => {
    let invitedThisSession = Util.clone(this.state.invitedThisSession);
    invitedThisSession[this.state.inviteeEmail] = true;
    this.setState({invitedThisSession});
  }

  openAddDialog = (addMemberID: AccountID) => {
    if (this.props.groupID) {
      ReaderModal.openReaderModal({
        header: 'Do you want to add this person to the group?',
        showOK: true,
        okCaption: 'YES',
        showCancel: true,
        onOK: () => this.addMember(addMemberID),
      });
    } else {
      this.addMember(addMemberID);
    }
  }

  addMember = (addMemberID: AccountID) => {
    this.markPotentialAsAdded(addMemberID);

    this.svrCmd('sendReaderInviteByID', {inviteeID: addMemberID, reactionGroupID: this.props.groupID, bookID: this.props.bookID},
    (err, _data) => {
      if (err) {
        Log.warn('@palmer', err);
        return;
      }
    });
    if (this.props.groupID) {
      const channelID = this.getData(['reactionGroup2', this.props.groupID as string, 'channelID']);
      const bookID = this.getMetricsBookID();
      Metrics.recordInSet(Metrics.SET.READER.APP, 'invitedGroups', {
        inviteeID: addMemberID,
        reactionGroupID: this.props.groupID,
        channelID,
        bookID,
        fromPhoneContacts: false,
      });
    }
  }

  clearInputs = () => {
    this.setState({inviteeName: '', inviteeEmail: ''});
  }

  handleSearch = (term : string) => {
    this.setState({searchText: term});
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

  render() {
    let peopleList : ContactMember[] = Util.clone(this.state.phoneContactList); // concat here for other sources of non-Ampersand people

    if (this.state.searchText) {
      let people = this.state.phoneContactList.concat(this.state.potentialContactList); // when searching, all contacts become the same
      people = people.filter((contact: ContactMember) => Util.matchAllSearchTerms(this.state.searchText, contact.name));
      people.sort((a, b) => Util.cmpStringOrUndefined(false, false, false, a.name, b.name));
      peopleList = people;
    }

    if (this.state.invitedOnServer || this.state.invitedThisSession) {
      for (const person of peopleList) {
        if (person.contactInfo) {
          const email = Constants.normalizeEmail(person.contactInfo);
          if (this.state.invitedOnServer && this.state.invitedOnServer[email]) {
            person.alreadyInvited = true;
          } else if (this.state.invitedThisSession && this.state.invitedThisSession[email]) {
              person.alreadyInvited = true;
          }
        }
      }
    }

    const context : InviteContactsContext = {
      potentialContactList: this.state.potentialContactList,
      peopleList,
      connections: this.state.connections,
      goBack: () => Navigation.goBack(),
      searchText: this.state.searchText,
      handleSearch: this.handleSearch,
      emailInvite: () => this.openContactInfo(),
      tshirtSuccess: this.state.tshirtSuccess,
      dismissTshirt: () => this.dismissTshirt(),
      followTshirt: this.followTshirt,
    };

    return (
      <FixedTemplate template='InviteContacts' context={context}/>
    );
  }
}

registerContextSchema(module, 'InviteContacts', InviteContacts.contextSchema);
