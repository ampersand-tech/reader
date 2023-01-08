/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import * as DB from 'clientjs/db';
import * as DBModify from 'clientjs/dbModify';
import * as ImageTools from 'clientjs/imageTools';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Util from 'overlib/client/clientUtil';
import * as IpcUtil from 'overlib/client/ipcClientUtil';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as DataStore from 'overlib/shared/dataStore';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

import 'clientjs/components/ReportBug.tsx';


const CONTACT_MASK = Util.objectMakeImmutable({
  name: 1,
  faceURL: 1,
});

const ACCOUNT_MASK = Util.objectMakeImmutable({
  id: 1,
  name: 1,
  email: 1,
});

export interface ProfileContext {
  accountID: string;
  doLogout: () => void;
  isAdmin: boolean;
  openBugModal: () => void;
  showAdminMenu: boolean;
  toggleAdminMenu: (_e: any) => void;
  versionText: string;
  name: string;
  submitName: (name: string) => void;
  editName: () => void;
  editingName: boolean;
  cancel: (e: React.SyntheticEvent<HTMLElement>) => void;
  setAccountPicture: (files: any) => void;
  hasAccountPicture: boolean;
  email: string;
  goBack: () => void;
  isDemoing: boolean;
  resetForDemo: () => void;
}

interface State {
  editingName: boolean;
}

export class ProfileSettings extends InstrumentedDataWatcher<{}, State> {
  static contextSchema: StashOf<Types.Schema> = {
    accountID: Types.STRING,
    doLogout: Types.FUNCTION,
    isAdmin: Types.BOOL,
    openBugModal: Types.FUNCTION,
    showAdminMenu: Types.BOOL,
    toggleAdminMenu: Types.FUNCTION,
    versionText: Types.STRING,
    name: Types.STRING,
    submitName: Types.FUNCTION,
    editName: Types.FUNCTION,
    editingName: Types.BOOL,
    cancel: Types.FUNCTION,
    setAccountPicture: Types.FUNCTION,
    hasAccountPicture: Types.BOOL,
    email: Types.STRING,
    goBack: Types.FUNCTION,
    isDemoing: Types.BOOL,
    resetForDemo: Types.FUNCTION,
  };

  static sampleContext: ProfileContext = {
    accountID: 'BTM',
    isAdmin: false,
    showAdminMenu: false,
    versionText: 'version 0.0.1',
    openBugModal: TEST_FUNC as any,
    toggleAdminMenu: TEST_FUNC as any,
    doLogout: TEST_FUNC as any,
    name: 'Bill TesterMan',
    submitName: TEST_FUNC as any,
    editName: TEST_FUNC as any,
    editingName: false,
    cancel: TEST_FUNC as any,
    setAccountPicture: TEST_FUNC as any,
    hasAccountPicture: true,
    email: 'bill@testerman.com',
    goBack: TEST_FUNC as any,
    isDemoing: false,
    resetForDemo: TEST_FUNC as any,
  };

  state = {
    showAccountPage: false,
    editingName: false,
  };

  doLogout = () => {
    ReaderModal.openReaderModal({
      showOK: true,
      showCancel: true,
      header: 'Logging Out',
      text: 'Are you sure you want to log out?',
      textClasses: 'ta-c',
      onOK: () => {
        if (IpcUtil.isTestClient()) {
          Navigation.setNavigationTestHook();
        }
        Navigation.logout(ReaderRoutes.login0);
      },
    });
  }

  private openBugModal = () => {
    GlobalModal.openModal('reportBugReader');
  }

  private toggleAdminMenu = (_e) => {
    DataStore.toggleBool(['localSettings', 'readerAdminMenu']);
  }

  componentWillMount() {
    super.componentWillMount();
    IpcUtil.sendMessage('keyboardHideBar', {hideBar: true});
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    IpcUtil.sendMessage('keyboardHideBar', {hideBar: false});
  }

  goBack = () => {
    Navigation.goBack();
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

  private resetForDemo = () => {
    DBModify.clearPendingChanges(() => {
      DataStore.updateData(['App', 'showDemoScreen'], true);
      Navigation.go(ReaderRoutes.discover);
    });
  }

  render() {
    const isAdmin = this.getData(['App', 'isAdmin']);
    const versionText = 'APP VERSION ' + this.getData(['App', 'clientVersion']);

    const accountInfo = this.getData(['account'], ACCOUNT_MASK);
    const contact = this.getData(['contacts', accountInfo.id], CONTACT_MASK);

    const isDemoing = (accountInfo.email as string).endsWith('@ampersand.com');

    const context : ProfileContext = {
      accountID: accountInfo.id,
      doLogout: this.doLogout,
      isAdmin,
      openBugModal: this.openBugModal,
      showAdminMenu: this.getData(['localSettings', 'readerAdminMenu']),
      toggleAdminMenu: this.toggleAdminMenu,
      versionText,
      name: accountInfo.name,
      submitName: this.submitName,
      editName: this.editName,
      editingName: this.state.editingName,
      cancel: this.cancel,
      setAccountPicture: this.setAccountPicture.bind(this, accountInfo.id),
      hasAccountPicture: Boolean(contact && contact.faceURL),
      email: accountInfo.email,
      goBack: this.goBack,
      isDemoing,
      resetForDemo: this.resetForDemo,
    };

    return (
      <FixedTemplate template='ProfileSettings' testid='ProfileSettings' context={context} />
    );
  }
}

   registerContextSchema(module, 'ProfileSettings', ProfileSettings.contextSchema, ProfileSettings.sampleContext);

