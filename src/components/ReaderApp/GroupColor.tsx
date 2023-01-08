/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import * as GroupUtils from 'clientjs/groupUtils';
import * as ManuscriptInfo from 'clientjs/manuscriptInfo';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface GroupColorMember {
  accountID: string;
  colorName: string;
  colorSet: number;
  isSelf: boolean;
  userColor?: string;
}

interface Props {
  close: () => void;
}

interface GroupColorContext {
  channelName: string;
  close: () => void;
  groupMembers: GroupColorMember[];
}

export class GroupColor extends DataWatcher<Props, {}> {
  context: ProviderContext;

  static propTypes = {
    close: PropTypes.func.isRequired,
  };

  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });


  static contextSchema: Stash = {
    channelName: Types.STRING,
    close: Types.FUNCTION,
    groupMembers: ObjSchema.ARRAY_OF({
      accountID: Types.ACCOUNTIDSTR,
      colorName: Types.STRING,
      colorSet: Types.NUMBER,
      isSelf: Types.BOOL,
      userColor: Types.STRING,
    }),
  };

  static sampleContext: Stash = {
    channelName: 'Test',
    close: TEST_FUNC,
    groupMembers: [{
      accountID: 'testID3',
      colorName: 'red',
      colorSet: 4,
      isSelf: true,
      userColor: '#FF6363',
    }, {
      accountID: 'testID4',
      colorName: 'yellow',
      colorSet: 0,
      isSelf: false,
      userColor: '#FFFF63',
    }],
  };

  render() {
    const userID = DB.getAccountID();
    const distributionID = this.context.readerContext.getDistributionID();
    let channelName = this.getData(['distributions', distributionID, 'metaData', 'name'], null, '');
    if (Constants.isPseudoChannelID(distributionID)) {
      const bookID = this.context.readerContext.getBookID();
      const draftID = Constants.extractContentID(bookID) as string as Constants.DraftID;
      channelName = ManuscriptInfo.getManuscriptData(this, draftID, ['title']);
    }
    const groupID = this.context.readerContext.getGroupID();
    const members = GroupUtils.getMemberIDs(this, groupID);
    const groupMembers: GroupColorMember[] = [];

    for (const id in members) {
      const colorSet = GroupUtils.getColorSet(this, groupID, id as AccountID);
      const color = UserColors.getUserColor(this, groupID, id as AccountID);
      groupMembers.push({
        accountID: id,
        colorName: color.name,
        colorSet: colorSet,
        isSelf: id === userID,
        userColor: color.inlineBase,
      });
    }

    const context : GroupColorContext = {
      channelName,
      close: this.props.close,
      groupMembers,
    };

    return <FixedTemplate template='GroupColor' context={context}/>;
  }
}

registerContextSchema(module, 'GroupColor', GroupColor.contextSchema, GroupColor.sampleContext);
