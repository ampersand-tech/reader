/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate';
import * as GroupUtils from 'clientjs/groupUtils';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Navigation from 'overlib/client/navigation';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface ReaderGroupMenuContext {
  groupID: Constants.ReactionGroupID;
  groupName: string;
  bookID: Constants.BookID;
  closeCB: () => void;
  goToGroup: () => void;
  quietMode: boolean;
  toggleQuietMode: () => void;
  allowedInvite: boolean;
}

export class ReaderGroupMenu extends DataWatcher {
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  context: ProviderContext;

  static contextSchema: StashOf<Types.Schema> = {
    groupID: Types.STRING,
    groupName: Types.STRING,
    bookID: Types.STRING,
    closeCB: Types.FUNCTION,
    goToGroup: Types.FUNCTION,
    quietMode: Types.BOOL,
    toggleQuietMode: Types.FUNCTION,
    allowedInvite: Types.BOOL,
  };

  private closeCB = () => {
    this.context.readerContext.closeGroupMenu();
  }

  private goToGroup = () => {
    const groupID = this.context.readerContext.getGroupID();
    const bookID = this.context.readerContext.getBookID();

    this.closeCB();
    Navigation.go(ReaderRoutes.inviteGroup(groupID, bookID));
  }

  render() {
    const show = this.context.readerContext.getUIState(this, ['showGroupMenu']);
    const quietMode = this.context.readerContext.getUIState(this, ['quietMode']);

    const groupID = this.context.readerContext.getGroupID();

    const context: ReaderGroupMenuContext = {
      groupID,
      bookID: this.context.readerContext.getBookID(),
      groupName: GroupUtils.getGroupName(this, groupID),
      closeCB: this.closeCB,
      goToGroup: this.goToGroup,
      quietMode,
      toggleQuietMode: this.context.readerContext.toggleQuietMode,
      allowedInvite: this.context.readerContext.getReaderDocType() === Constants.READER_DOC_TYPE.PUBLISHED,
    };

    return (
      <div classes={`pos-r trans-tr-0.3s ${show ? 'ty-0' : 'ty--220 ptrevt-n'}`}>
        <FixedTemplate template='ReaderGroupMenu' context={context} />
      </div>
    );
  }
}



registerContextSchema(module, 'ReaderGroupMenu', ReaderGroupMenu.contextSchema);
