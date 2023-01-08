/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import * as GroupUtils from 'clientjs/groupUtils';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import * as ReactionGroupDB from 'clientjs/shared/reactionGroupDB';
import * as moment from 'moment';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const HAS_NOT_READ_STRING = 'has not read yet';
const NO_PROGRESS_DATA_STRING = 'progress data unavailable';

const MEMBERS_MASK = Util.objectMakeImmutable({
  _ids: {
    colorSet: 1,
  },
});

const PENDING_INVITES_MASK = Util.objectMakeImmutable({
  _ids: {
    name: 1,
    inviteTime: 1,
  },
});

const GROUP_CONTENT_MASK = Util.objectMakeImmutable({
  _ids: {
    userID: {
      _ids: {
        progress: {
          _ids: {
            chars: 1,
          },
        },
      },
    },
  },
});

interface ReadingProgress {
  percentComplete: number;
  lastRead: string;
}

interface ColorChoice {
  color: string;
  isCurrentColor: boolean;
  select: () => void;
}

interface GroupMember {
  accountID: AccountID;
  colorChoices: ColorChoice[];
  colorSet: number;
  isSelf: boolean;
  lastRead: string;
  progress: number;
  showColors: boolean;
  toggleShowColors: () => void;
  userColor?: string;
}

interface PendingInvite {
  name: string;
  inviteTime: number;
}

interface ReactionGroupContext {
  coverURL: string;
  goBack: () => void;
  goInvite: () => void;
  goToBook: () => void;
  leaveGroup: () => void;
  groupCount: number;
  groupMembers: GroupMember[];
  groupName: string;
  hasInvites: boolean;
  hasStartedReading: boolean;
  isAdmin: boolean;
  maxMembers: number;
  pendingInvites: PendingInvite[];
  showInviteButton: boolean;
  showButtons: boolean;
  showNextBook: () => void;
  showPrevBook: () => void;
  title: string;

  isEditingGroupName: boolean;
  editingGroupName: string;
  typingGroupName: (name: string) => void;
  submitGroupName: () => void;
  cancelEditingGroupName: () => void;
  beginEditingGroupName: () => void;
}

interface ReactionGroupProps {
  bookID?: Constants.BookID;
  groupID: Constants.ReactionGroupID;
}

interface ReactionGroupState {
  showColors: StashOf<boolean>;
  showButtons: boolean;

  isEditingGroupName: boolean;
  editingGroupName: string;
  activeBookID: Constants.BookID;
  memberReadingData: StashOf<ReadingProgress>;
}

export class ReactionGroup extends DataWatcher<ReactionGroupProps, ReactionGroupState> {
  static propTypes = {
    bookID: PropTypes.string,
    groupID: PropTypes.string.isRequired,
  };

  static contextSchema: StashOf<Types.Schema> = {
    coverURL: Types.STRING,
    goBack: Types.FUNCTION,
    goInvite: Types.FUNCTION,
    goToBook: Types.FUNCTION,
    leaveGroup: Types.FUNCTION,
    groupCount: Types.INT,
    groupMembers: ObjSchema.ARRAY_OF({
      accountID: Types.ACCOUNTIDSTR,
      colorChoices: ObjSchema.ARRAY_OF({
        color: Types.STRING,
        isCurrentColor: Types.BOOL,
        select: Types.FUNCTION,
      }),
      colorSet: Types.INT,
      isSelf: Types.BOOL,
      lastRead: Types.STRING,
      progress: Types.INT,
      showColors: Types.BOOL,
      toggleShowColors: Types.FUNCTION,
      userColor: Types.STRING,
    }),
    groupName: Types.STRING,
    hasInvites: Types.BOOL,
    hasStartedReading: Types.BOOL,
    isAdmin: Types.BOOL,
    maxMembers: Types.NUMBER,
    pendingInvites: ObjSchema.ARRAY_OF({
      name: Types.STRING,
      inviteTime: Types.TIME,
    }),
    showButtons: Types.BOOL,
    showInviteButton: Types.BOOL,
    showNextBook: Types.FUNCTION,
    showPrevBook: Types.FUNCTION,
    title: Types.STRING,

    isEditingGroupName: Types.BOOL,
    editingGroupName: Types.STRING,
    typingGroupName: Types.FUNCTION,
    submitGroupName: Types.FUNCTION,
    cancelEditingGroupName: Types.FUNCTION,
    beginEditingGroupName: Types.FUNCTION,
  };

  static sampleContext: Stash = {
    coverURL: '',
    goBack: TEST_FUNC,
    goInvite: TEST_FUNC,
    goToBook: TEST_FUNC,
    leaveGroup: TEST_FUNC,
    groupCount: 5,
    groupMembers: [{
      accountID: 'testID3',
      colorChoices: [
        {
          color: '#111111',
          isCurrentColor: false,
          select: TEST_FUNC,
        },
        {
          color: '#FF6363',
          isCurrentColor: true,
          select: TEST_FUNC,
        },
        {
          color: '#333333',
          isCurrentColor: false,
          select: TEST_FUNC,
        },
        {
          color: '#444444',
          isCurrentColor: false,
          select: TEST_FUNC,
        },
        {
          color: '#555555',
          isCurrentColor: false,
          select: TEST_FUNC,
        },
      ],
      colorSet: 0,
      isSelf: true,
      lastRead: '1 day ago',
      progress: 40,
      showColors: false,
      toggleShowColors: TEST_FUNC,
      userColor: '#FF6363',
    }, {
      accountID: 'testID4',
      colorChoices: [
        {
          color: '#111111',
          isCurrentColor: false,
          select: TEST_FUNC,
        },
        {
          color: '#FF6363',
          isCurrentColor: true,
          select: TEST_FUNC,
        },
        {
          color: '#333333',
          isCurrentColor: false,
          select: TEST_FUNC,
        },
        {
          color: '#444444',
          isCurrentColor: false,
          select: TEST_FUNC,
        },
        {
          color: '#555555',
          isCurrentColor: false,
          select: TEST_FUNC,
        },
      ],
      colorSet: 0,
      isSelf: false,
      lastRead: '2 days ago',
      progress: 30,
      showColors: false,
      toggleShowColors: TEST_FUNC,
      userColor: '#FF6363',
    }],
    groupName: 'That Test Group',
    hasInvites: true,
    hasStartedReading: true,
    isAdmin: true,
    maxMembers: 9,
    pendingInvites: [{
      name: 'Testy McTestface',
      inviteTime: 10000000,
    }],
    showButtons: true,
    showInviteButton: true,
    showNextBook: TEST_FUNC,
    showPrevBook: TEST_FUNC,
    title: 'A Book Title',

    isEditingGroupName: false,
    editingGroupName: '',
    typingGroupName: TEST_FUNC,
    submitGroupName: TEST_FUNC,
    cancelEditingGroupName: TEST_FUNC,
    beginEditingGroupName: TEST_FUNC,
  };

  state: ReactionGroupState = {
    showColors: {},
    showButtons: false,

    isEditingGroupName: false,
    editingGroupName: '',
    activeBookID: '' as Constants.BookID,
    memberReadingData: {},
  };

  componentWillMount() {
    super.componentWillMount();
    this.updateBookData(true);
  }

  componentDidMount() {
    // Make sure your pending invite is gone (slight handling of case that may occur due to multiple invites)
    const email = DB.getAccountEmail();
    const invite =
      this.getData(['reactionGroup2', this.props.groupID, 'pendingInvites', ReactionGroupDB.emailToReactionKey(email)]) ||
      this.getData(['reactionGroup2', this.props.groupID, 'pendingInvites', email]);
    if (invite) {
      Sketch.runAction('reactionGroup2.removePendingInvite', this.props.groupID, email);
    }
  }

  goBack = () => {
    Navigation.goBack();
  }

  goInvite = () => {
    const bookID = this.state.activeBookID || ('_' as Constants.BookID);
    Navigation.go(ReaderRoutes.inviteGroup(this.props.groupID, bookID));
  }

  goToBook = () => {
    Navigation.go(ReaderRoutes.content2(this.state.activeBookID, this.props.groupID));
  }

  parseProgressData = (progressData, bookID: Constants.BookID) => {
    const memberProgress = {};
    const [distributionID, itemID] = Constants.splitBookID(bookID);
    const bookLength = this.getData(['distributions', distributionID, 'items', itemID, 'charCount']);

    for (const userID in progressData) {
      const progressTimes = progressData[userID] ? progressData[userID].progress : {};
      if (Util.safeObjIsEmpty(progressTimes)) {
        memberProgress[userID] = {
          lastRead: HAS_NOT_READ_STRING,
          percentComplete: 0,
        };
        continue;
      } else if (!bookLength) {
        memberProgress[userID] = {
          lastRead: NO_PROGRESS_DATA_STRING,
          percentComplete: 0,
        };
        continue;
      }
      const mostRecent = GroupUtils.sortProgress(progressTimes)[0];
      const percentComplete = Math.floor(100 * (progressTimes[mostRecent].chars / bookLength));
      const lastRead = `read ${moment(mostRecent).fromNow()}`;

      memberProgress[userID] = { lastRead, percentComplete };
    }

    return memberProgress;
  }

  updateBookData = (forward: boolean) => {
    const groupBookData = this.getData(['reactionGroup2', this.props.groupID, 'content'], GROUP_CONTENT_MASK) || {};
    const bookIDs = Object.keys(groupBookData) as Constants.BookID[];
    if (bookIDs.length === 0) {
      return this.setState({
        memberReadingData: {},
        activeBookID: '' as Constants.BookID,
        showButtons: false,
      });
    }
    let activeBookID = this.state.activeBookID || this.props.bookID;
    const showButtons = bookIDs.length > 1;

    if (!this.state.activeBookID) {
      activeBookID = activeBookID || bookIDs[0];
    } else {
      const idx = bookIDs.indexOf(this.state.activeBookID);
      if (forward) {
        activeBookID = bookIDs[(idx + 1) % bookIDs.length];
      } else {
        if (idx === 0) {
          activeBookID = bookIDs[bookIDs.length - 1];
        } else {
          activeBookID = bookIDs[idx - 1];
        }
      }
    }

    const memberReadingData: StashOf<ReadingProgress> = this.parseProgressData(groupBookData[activeBookID].userID, activeBookID);

    this.setState({
      memberReadingData,
      activeBookID,
      showButtons,
    });
  }

  toggleShowColors = (userID: AccountID) => {
    const showColors = Util.clone(this.state.showColors);
    const newValue = !showColors[userID];
    for (let id in showColors) {
      showColors[id] = false;
    }
    showColors[userID] = newValue;
    this.setState({ showColors });
  }

  selectColor = (colorSet: number, userID: AccountID) => {
    GroupUtils.replaceColorSetOverrideWithSwitch(this.props.groupID, userID, colorSet);
    this.toggleShowColors(userID);
  }

  createColorChoices = (userID: string, curColorSet: number) : ColorChoice[] => {
    const colors = UserColors.getAllUserColors(this);
    const colorChoices : ColorChoice[] = [];
    for (let i = 0; i < Math.max(1, Constants.REACTION_COLOR_COUNT); i++) {
      const color = colors[i].inlineBase;
      colorChoices.push({
        color,
        isCurrentColor: curColorSet === i,
        select: this.selectColor.bind(this, i, userID),
      });
    }
    return colorChoices;
  }

  beginEditingGroupName = () => {
    this.setState({
      isEditingGroupName: true,
      editingGroupName: GroupUtils.getGroupName(this, this.props.groupID),
    });
  }

  cancelEditingGroupName = () => {
    this.setState({isEditingGroupName: false, editingGroupName: ''});
  }

  typingGroupName = value => {
    this.setState({editingGroupName: value});
  }

  submitGroupName = () => {
    Sketch.runAction('reactionGroup2.setName', this.props.groupID, this.state.editingGroupName);
    this.cancelEditingGroupName();
  }

  leaveGroup = () => {
    const members = this.getData(['reactionGroup2', this.props.groupID, 'members'], MEMBERS_MASK);

    const text = (Object.keys(members).length > 1)
      ? 'If you want to rejoin this group, you will need an invite from one of the other members.'
      : 'There is no way to undo this!'
    ;

    ReaderModal.openReaderModal({
      header: 'Are you sure?',
      text,
      showOK: true,
      okCaption: 'Leave Group',
      showCancel: true,
      onOK: () => {
        const userID = DB.getAccountID();
        this.svrCmd('removeReactionGroupMember', {groupID: this.props.groupID, userID}, () => {
          Navigation.go(ReaderRoutes.group);
        });
      },
    });
  }

  render() {
    if (!this.props.groupID) {
      Log.error('@sam', 'Invalid groupID', {groupID: this.props.groupID});
      Navigation.go(ReaderRoutes._404);
      return null;
    }
    if (this.props.bookID && this.props.bookID === 'invite') {
      Navigation.go(ReaderRoutes.inviteGroup(this.props.groupID, this.state.activeBookID));
    }
    const myID = DB.getAccountID();
    const channelID = this.getData(['reactionGroup2', this.props.groupID, 'channelID']);
    const pendingInviteData = this.getData(['reactionGroup2', this.props.groupID, 'pendingInvites'], PENDING_INVITES_MASK);
    const groupName = GroupUtils.getGroupName(this, this.props.groupID);
    const ids = this.state.activeBookID.split('.');
    const itemID = ids.length === 2 ? ids[1] : this.state.activeBookID;
    const coverURL = this.getData(['distributions', channelID, 'items', itemID, 'coverImageURL']) || '';
    const title = this.getData(['distributions', channelID, 'items', itemID, 'title']) || '';
    const members = this.getData(['reactionGroup2', this.props.groupID, 'members'], MEMBERS_MASK);
    const bookLength = this.getData(['distributions', channelID, 'items', itemID, 'charCount']);

    if (Util.safeObjIsEmpty(members)) {
      Log.error('@sam', 'Invalid groupID', {groupID: this.props.groupID});
      Navigation.go(ReaderRoutes._404);
      return null;
    }
    const groupMembers: GroupMember[] = [];
    const pendingInvites: PendingInvite[] = [];
    const isAdmin : boolean = !!this.getData(['App', 'isAdmin']);

    const colors = UserColors.getAllUserColors(this);
    const lastReadDefault = bookLength ? HAS_NOT_READ_STRING : NO_PROGRESS_DATA_STRING;
    for (const id in members) {
      const colorSet = GroupUtils.getColorSet(this, this.props.groupID, id as AccountID);
      const color = colors[colorSet].inlineBase;
      groupMembers.push({
        accountID: id as AccountID,
        colorChoices: this.createColorChoices(id, colorSet),
        colorSet: colorSet,
        isSelf: id === myID,
        lastRead: this.state.memberReadingData[id] ? this.state.memberReadingData[id].lastRead : lastReadDefault,
        progress: this.state.memberReadingData[id] ? this.state.memberReadingData[id].percentComplete : 0,
        showColors: !!this.state.showColors[id],
        toggleShowColors: this.toggleShowColors.bind(this, id),
        userColor: color,
      });
    }

    for (const key in pendingInviteData) {
      pendingInvites.push({
        name: pendingInviteData[key].name,
        inviteTime: pendingInviteData[key].inviteTime,
      });
    }

    const context : ReactionGroupContext = {
      coverURL: coverURL,
      goBack: this.goBack,
      goInvite: this.goInvite,
      goToBook: this.goToBook,
      leaveGroup: this.leaveGroup,
      groupCount: groupMembers.length,
      groupMembers,
      groupName,
      hasInvites: !!pendingInvites.length,
      hasStartedReading: !Util.safeObjIsEmpty(this.state.memberReadingData),
      isAdmin,
      maxMembers: Constants.REACTION_COLOR_COUNT,
      pendingInvites,
      showButtons: this.state.showButtons,
      showInviteButton: GroupUtils.canSendInvite(this.props.groupID),
      showNextBook: () => this.updateBookData(true),
      showPrevBook: () => this.updateBookData(false),
      title: title,

      isEditingGroupName: this.state.isEditingGroupName,
      editingGroupName: this.state.editingGroupName,
      typingGroupName: this.typingGroupName,
      submitGroupName: this.submitGroupName,
      cancelEditingGroupName: this.cancelEditingGroupName,
      beginEditingGroupName: this.beginEditingGroupName,
    };

    return (
      <FixedTemplate template='ReactionGroup' context={context} />
    );
  }
}

registerContextSchema(module, 'ReactionGroup', ReactionGroup.contextSchema, ReactionGroup.sampleContext);
