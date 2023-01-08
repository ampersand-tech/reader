/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as GroupUtils from 'clientjs/groupUtils';
import * as Constants from 'clientjs/shared/constants';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as Navigation from 'overlib/client/navigation';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface GroupMember {
  accountID: AccountID;
  colorSet?: number;
}

interface ReactionGroupMembersContext {
  goToGroup: () => void;
  groupMembers: GroupMember[];
}

interface ReactionGroupMembersProps {
  classes?: string;
  bookID?: Constants.BookID;
  groupID: Constants.ReactionGroupID;
  visibleMembers?: Stash;
  closeCB?: () => void;
}

export class ReactionGroupMembers extends DataWatcher<ReactionGroupMembersProps, {}> {

  static propTypes = {
    bookID: PropTypes.string,
    classes: PropTypes.string,
    groupID: PropTypes.string.isRequired,
    visibleMembers: PropTypes.object,
    closeCB: PropTypes.func,
  };

  static contextSchema: Stash = {
    goToGroup: Types.FUNCTION,
    groupMembers: ObjSchema.ARRAY_OF({
      accountID: Types.ACCOUNTIDSTR,
      colorSet: Types.NUMBER,
    }),
  };

  static sampleContext: Stash = {
    goToGroup: TEST_FUNC,
    groupMembers: [{
      accountID: 'testID3',
      colorSet: 0,
    }, {
      accountID: 'testID4',
      colorSet: 1,
    }],
  };

  goToGroup = () => {
    const bookID = this.props.bookID;
    this.props.closeCB && this.props.closeCB();

    if (bookID) {
      Navigation.go(ReaderRoutes.group2(this.props.groupID, bookID));
    } else {
      Navigation.go(ReaderRoutes.group1(this.props.groupID));
    }
  }

  render() {
    const members = GroupUtils.getMemberIDs(this, this.props.groupID);
    const groupMembers: GroupMember[] = [];

    for (const id in members) {
      if (this.props.visibleMembers && !this.props.visibleMembers[id]) {
        continue;
      }
      const colorSet = GroupUtils.getColorSet(this, this.props.groupID, id as AccountID);
      groupMembers.push({
        accountID: id as AccountID,
        colorSet: colorSet,
      });
    }

    const context : ReactionGroupMembersContext = {
      goToGroup: this.goToGroup,
      groupMembers,
    };

    return (
      <Flex.Col classes={this.props.classes}>
        <FixedTemplate template='ReactionGroupMembers' context={context}/>
      </Flex.Col>);
  }
}

registerContextSchema(module, 'ReactionGroupMembers', ReactionGroupMembers.contextSchema, ReactionGroupMembers.sampleContext);
