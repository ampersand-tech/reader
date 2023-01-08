/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as DB from 'clientjs/db';
import * as ImageTools from 'clientjs/imageTools';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import * as IpcUtil from 'overlib/client/ipcClientUtil';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import { USER_TYPE } from 'overlib/shared/constants';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

import 'clientjs/components/ReportBug.tsx';
import { VRData } from 'clientjs/shared/verticalReaderDataDB';

interface LibraryItemSchema {
  title: string;
  author: string;
  lastOpened: number;
  percentComp: number;
  coverURL: string;
  goToBook: () => void;
}

interface TabsSchema {
  name: string;
  active: boolean;
  clickFn: (e: any) => void;
}

const LIBRARY_MASK = Util.objectMakeImmutable({
  _ids: {
    content: {
      _ids: {
        preview: 1,
      },
    },
  },
});

const CONTACT_MASK = Util.objectMakeImmutable({
  name: 1,
  faceURL: 1,
});

const ACCOUNT_MASK = Util.objectMakeImmutable({
  id: 1,
  name: 1,
  email: 1,
});

const VRDATA_MASK = Util.objectMakeImmutable({
  allCharCount: 1,
  positions: {
    current: {
      timestamp: 1,
    },
    maxSeen: {
      totalCharacters: 1,
    },
  },
});

export interface ProfileContext {
  accountID: string;
  cancel: (e: React.SyntheticEvent<HTMLElement>) => void;
  goToSettings: () => void;
  editName: () => void;
  editingName: boolean;
  email: string;
  hasAccountPicture: boolean;
  name: string;
  readingNow: LibraryItemSchema[];
  inbox: LibraryItemSchema[];
  contactCount: number;
  addFriends: () => void;
  goToContacts: () => void;
  setAccountPicture: (files: any) => void;
  submitName: (name: string) => void;
  goToDiscover: () => void;
  tabs: StashOf<TabsSchema>;
  readsActive: boolean;
  inboxActive: boolean;
  projectsActive: boolean;
  searchText: string;
  handleSearch: (searchText: string) => void;
  sortByRecent: boolean;
  sortByAlphaDesc: boolean;
  sortClick: () => void;
  searchFocused: boolean;
  focusBlurCB: (focused: boolean) => void;
}

interface State {
  editingName: boolean;
  activeTab: string;
  searchText: string;
  searchFocused: boolean;
  sortBy: StashOf<boolean>;
}

export class ProfilePage extends InstrumentedDataWatcher<{}, State> {
  static noTransition = true;

  static contextSchema: StashOf<Types.Schema> = {
    accountID: Types.STRING,
    cancel: Types.FUNCTION,
    editName: Types.FUNCTION,
    editingName: Types.BOOL,
    email: Types.STRING,
    goToSettings: Types.FUNCTION,
    hasAccountPicture: Types.BOOL,
    name: Types.STRING,
    readingNow: ObjSchema.ARRAY_OF({
      title: Types.STRING_NULLABLE,
      author: Types.STRING_NULLABLE,
      lastOpened: Types.TIME,
      percentComp: Types.INT,
      coverURL: Types.STRING,
      goToBook: Types.FUNCTION,
    }),
    inbox: ObjSchema.ARRAY_OF({
      title: Types.STRING_NULLABLE,
      author: Types.STRING_NULLABLE,
      lastOpened: Types.TIME,
      percentComp: Types.INT,
      coverURL: Types.STRING,
      goToBook: Types.FUNCTION,
    }),
    contactCount: Types.INT,
    addFriends: Types.FUNCTION,
    goToContacts: Types.FUNCTION,
    setAccountPicture: Types.FUNCTION,
    submitName: Types.FUNCTION,
    goToDiscover: Types.FUNCTION,
    tabs: ObjSchema.MAP({
      name: Types.STRING,
      active: Types.BOOL,
      clickFn: Types.FUNCTION,
    }),
    readsActive: Types.BOOL,
    inboxActive: Types.BOOL,
    projectsActive: Types.BOOL,
    searchText: Types.STRING,
    handleSearch: Types.FUNCTION,
    sortByRecent: Types.BOOL,
    sortByAlphaDesc: Types.BOOL,
    sortClick: Types.FUNCTION,
    searchFocused: Types.BOOL,
    focusBlurCB: Types.FUNCTION,
  };

  state = {
    editingName: false,
    activeTab: 'Reads',
    searchText: '',
    searchFocused: false,
    sortBy: {recent: true, alphaDesc: false},
  };

  componentWillMount() {
    super.componentWillMount();
    IpcUtil.sendMessage('keyboardHideBar', {hideBar: true});
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    IpcUtil.sendMessage('keyboardHideBar', {hideBar: false});
  }

  setAccountPicture = (accountID, files) => {
    ImageTools.resizeAndUploadFile(files[0], accountID, 128, function(error, imageInfo) {
      if (error || !imageInfo) {
        Log.error('failed to upload profile image ' + (error || ''));
        return;
      }
      if (!imageInfo.url) {
        Log.error('couldn\'t get url for image');
        return;
      }
      if (!imageInfo.w || !imageInfo.h) {
        Log.error('invalid dimensions for profile picture, width: ' + imageInfo.w + ' height: ' + imageInfo.h);
        return;
      }
      DB.updateAccountFaceURL(imageInfo.url);
    });
  }

  submitName = (name: string) => {
    // TODO: validate?
    if (name && typeof name === 'string') {
      name = name.trim();
      if (name) {
        Sketch.runAction('account.updatePersonalDetails', { name: name });
      }
    }
    this.setState({editingName: false});
  }

  editName = () => {
    this.setState({editingName: true});
  }

  cancel = (e: React.SyntheticEvent<HTMLElement>) => {
    e && Util.eatEvent(e);
    this.setState({editingName: false});
  }

  setActiveTab = (newTab: string) => {
    this.setState({activeTab: newTab});
  }

  buildLibraryItem = (distributionID: Constants.DistributionID, itemID: Constants.ContentItemID): LibraryItemSchema => {
    const bookID = Constants.makeBookID(distributionID, itemID);
    const coverURL = this.getData(['distributions', distributionID, 'items', itemID, 'coverImageURL']) || '';
    const goToBook = () => Navigation.go(ReaderRoutes.content1(bookID as Constants.BookID));
    const title = this.getData(['distributions', distributionID, 'items', itemID, 'title'])
    || this.getData(['library', 'private', 'content', itemID, 'name'])
    || '';
    const author = this.getData(['distributions', distributionID, 'metaData', 'name']) || '';

    const vrdata: VRData = this.getData(['vrdata', bookID], VRDATA_MASK);
    let percentComp: number = 0;
    let lastOpened: number = 0;
    if (vrdata && vrdata.allCharCount) {
      const current = vrdata.positions && vrdata.positions.current;
      if (current) {
        lastOpened = current.timestamp || 0;
      }
      const maxSeen = vrdata.positions && vrdata.positions.maxSeen;
      if (maxSeen) {
        percentComp = Math.round(100 * (maxSeen.totalCharacters || 0) / vrdata.allCharCount);
      }
    }
    return {
      title,
      author,
      lastOpened,
      percentComp,
      coverURL,
      goToBook,
    };
  }

  handleSearch = (searchText : string) => {
    this.setState({searchText});
  }

  sortLibraryItems = (item: LibraryItemSchema): boolean => {
    const terms = this.state.searchText.split(/\s+/);
    const searchFields = ['title', 'author'];
    for (const field of searchFields) {
      for (const term of terms) {
        if (item[field].toLowerCase().indexOf(term.toLowerCase()) >= 0) {
          return true;
        }
      }
    }
    return false;
  }

  handleSortClick = () => {
    let sortBy = Util.clone(this.state.sortBy);
    for (const s in sortBy) {
      sortBy[s] = !sortBy[s];
    }
    this.setState({sortBy});
  }

  focusBlurCB = (focused: boolean) => {
    this.setState({searchFocused: focused});
  }

  render() {
    const accountInfo = this.getData(['account'], ACCOUNT_MASK);
    const accountID = accountInfo.id;
    const contact = this.getData(['contacts', accountID], CONTACT_MASK);
    const readingNowObj: StashOf<LibraryItemSchema> = {};
    const inboxObj: StashOf<LibraryItemSchema> = {};

    const contacts = this.getData(['contacts'], Util.IDS_MASK);

    // grab all currently reading books
    const library = this.getData(['library'], LIBRARY_MASK);
    for (const _distributionID in library) {
      const distributionID = _distributionID as Constants.DistributionID;
      const content = library[distributionID].content;
      for (const _itemID in content) {
        const itemID = _itemID as Constants.ContentItemID;
        const exists = this.getData(['distributions', distributionID, 'items', itemID], 1);
        const bookID = Constants.makeBookID(distributionID, itemID);
        if (Constants.isPrivateShareChannelID(distributionID)) {
          inboxObj[bookID] = this.buildLibraryItem(distributionID, itemID);
        } else if (exists && !content[itemID].preview) {
          readingNowObj[bookID] = this.buildLibraryItem(distributionID, itemID);
        }
      }
    }

    let sortFunc = (a: LibraryItemSchema, b: LibraryItemSchema): number => { return b.lastOpened - a.lastOpened; };
    if (this.state.sortBy.alphaDesc) {
      sortFunc = (a: LibraryItemSchema, b: LibraryItemSchema): number =>
      { return Util.cmpStringOrUndefined(false, false, false, a.title, b.title); };
    }

    const readingNow: LibraryItemSchema[] = Util.objToArray(readingNowObj, sortFunc);
    const inbox: LibraryItemSchema[] = Util.objToArray(inboxObj, sortFunc);

    let tabs = {Reads: {name: 'Reads', active: true, clickFn: () => this.setActiveTab('Reads')}};

    const readerType = this.getData(['account', 'userType']);
    if (readerType === USER_TYPE.WRITER) {
      tabs['Inbox'] = {name: 'Inbox', active: false, clickFn: () => this.setActiveTab('Inbox')};
      tabs['Projects'] = {name: 'Projects', active: false, clickFn: () => this.setActiveTab('Projects')};
    }

    for (const tab in tabs) {
      tabs[tab].active = (tab === this.state.activeTab);
    }

    const context : ProfileContext = {
      accountID: accountInfo.id,
      cancel: this.cancel,
      submitName: this.submitName,
      editName: this.editName,
      editingName: this.state.editingName,
      email: accountInfo.email,
      goToSettings: () => Navigation.go(ReaderRoutes.accountSettings),
      hasAccountPicture: Boolean(contact && contact.faceURL),
      name: accountInfo.name,
      readingNow: readingNow.filter(this.sortLibraryItems),
      inbox: inbox.filter(this.sortLibraryItems),
      contactCount: Object.keys(contacts).length !== 1 ? Object.keys(contacts).length : 0, // contacts has 1 person (you) if you have no friends
      addFriends:  () => Navigation.go(ReaderRoutes.inviteContacts0),
      goToContacts: () => Navigation.go(ReaderRoutes.contacts),
      setAccountPicture: this.setAccountPicture.bind(this, accountInfo.id),
      goToDiscover: () => { Navigation.go(ReaderRoutes.discover); },
      tabs,
      readsActive: tabs.Reads && tabs.Reads.active,
      inboxActive: Boolean(tabs['Inbox']) && tabs['Inbox'].active, // convert undefined to false
      projectsActive: Boolean(tabs['Projects']) && tabs['Projects'].active,
      searchText: this.state.searchText,
      handleSearch: this.handleSearch,
      sortByRecent: this.state.sortBy.recent,
      sortByAlphaDesc: this.state.sortBy.alphaDesc,
      sortClick: this.handleSortClick,
      searchFocused: this.state.searchFocused,
      focusBlurCB: this.focusBlurCB,
    };

    return (
      <FixedTemplate template='ProfilePage' testid='ProfilePage' context={context} />
    );
  }
}

registerContextSchema(module, 'ProfilePage', ProfilePage.contextSchema);
