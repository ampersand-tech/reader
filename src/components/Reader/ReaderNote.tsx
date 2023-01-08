/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import * as ReaderStyle from 'clientjs/components/CanvasReader/ReaderStyle';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import { cmpHashTags } from 'clientjs/groupUtils';
import { HashTag, HashTagData } from 'clientjs/shared/reactionGroupDB';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import { getTouches } from 'overlib/client/components/Layout/TouchDispatcher';
import { TEST_FUNC } from 'overlib/shared/constants';
import { ScreenSpacePoint } from 'overlib/shared/mathUtils';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface NoteState {
  noteValue: string;
  origValue: string;
}

interface HashTagButton {
  onTouchEnd: (e: React.SyntheticEvent<HTMLElement>) => void;
  tag: string;
}

const TOUCH_DIST_SQRD = 500;

const defaultHashTags: HashTag[] = [
  {
    tag: 'plot',
    count: 0,
    mostRecentUsage: 0,
  },
  {
    tag: 'characters',
    count: 0,
    mostRecentUsage: 0,
  },
  {
    tag: 'summary',
    count: 0,
    mostRecentUsage: 0,
  },
  {
    tag: 'grammar',
    count: 0,
    mostRecentUsage: 0,
  },
];

interface NoteContext {
  setNote: (value: string) => void;
  note: string;
  showDelete: boolean;
  save: (e: React.SyntheticEvent<HTMLElement>) => void;
  delete: (e: React.SyntheticEvent<HTMLElement>) => void;
  cancel: (e: React.SyntheticEvent<HTMLElement>) => void;
  showSave: boolean;
  color: string;
  fontSize: number;
  hashTags: HashTagButton[];
  onTouchStart: (e: React.SyntheticEvent<HTMLElement>) => void;
  onTouchMove: (e: React.SyntheticEvent<HTMLElement>) => void;
}

export class ReaderNote extends DataWatcher<{}, NoteState> {
  context: ProviderContext;
  static contextSchema: StashOf<Types.Schema> = {
    setNote: Types.FUNCTION,
    note: Types.STRING,
    save: Types.FUNCTION,
    delete: Types.FUNCTION,
    cancel: Types.FUNCTION,
    showSave: Types.BOOL,
    showDelete: Types.BOOL,
    color: Types.STRING,
    fontSize: Types.NUMBER,
    onTouchStart: Types.FUNCTION,
    onTouchMove: Types.FUNCTION,
    hashTags: ObjSchema.ARRAY_OF({
      onTouchEnd: Types.FUNCTION,
      tag: Types.STRING,
    }),
  };

  static sampleContext: Stash = {
    setNote: TEST_FUNC,
    note: 'sample sentence',
    save: TEST_FUNC,
    delete: TEST_FUNC,
    showSave: true,
    cancel: TEST_FUNC,
    showDelete: true,
    color: 'red',
    fontSize: 16,
    onTouchStart: TEST_FUNC,
    onTouchMove: TEST_FUNC,
    hashTags: [
      {
        onTouchEnd: TEST_FUNC,
        tag: 'tag1',
      },
      {
        onTouchEnd: TEST_FUNC,
        tag: 'tag2',
      },
    ],
  };

  state = {
    noteValue: '',
    origValue: '',
  };

  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  hashTagSet: HashTag[];

  componentWillMount() {
    super.componentWillMount();

    let noteValue = '';

    const editComment = this.context.readerContext.getUIState(this, ['editCommentID']);
    if (editComment) {
      const pID = this.context.readerContext.getUIState(null, ['selection', 'pID']);
      const sIdx = this.context.readerContext.getUIState(null, ['selection', 'index']);
      noteValue = this.context.readerContext.getReactionGroupData(null, ['threads', pID, 'sentences', sIdx, 'comments', editComment, 'text'], 1)
        || '';
    }
    this.setState({
      noteValue: noteValue,
      origValue: noteValue,
    });

    const hashTags: StashOf<HashTagData> = this.context.readerContext.getReactionGroupHashTags(null);
    this.hashTagSet = [];

    for (const hash in hashTags) {
      this.hashTagSet.push({
        tag: hash,
        count: hashTags[hash].count,
        mostRecentUsage: hashTags[hash].mostRecentUsage,
      });
    }

    // Include defaults if not already in there.
    for (let i = 0; i < defaultHashTags.length; ++i) {
      if (hashTags.hasOwnProperty(defaultHashTags[i].tag)) {
        continue;
      }
      this.hashTagSet.push(Util.clone(defaultHashTags[i]));
    }

    this.hashTagSet.sort(cmpHashTags);

  }

  save = (e?: React.SyntheticEvent<HTMLElement> | string) => {
    const text = this.state.noteValue;
    this.context.readerContext.readerReactions.addCommentLocal(text);
    this.close();
    if (e && typeof e !== 'string') {
      e.stopPropagation();
    }
  }

  delete = (e?: React.SyntheticEvent<HTMLElement> | string) => {
    this.context.readerContext.readerReactions.addCommentLocal('');
    this.close();
    if (e && typeof e !== 'string') {
      e.stopPropagation();
    }
  }

  setNote = (value: string) => {
    this.setState({noteValue: value});
  }

  close = () => {
    this.context.readerContext.clearSelection();
    this.context.readerContext.removeUIState(['editCommentID']);
    this.context.readerContext.removeUIState(['activeBar']);
    this.setNote('');
  }

  cancel = (e?: React.SyntheticEvent<HTMLElement> | string) => {
    this.close();
    if (e && typeof e !== 'string') {
      e.stopPropagation();
    }
  }

  // Track touch events for movement. All of this is just to prevent the hashtag bar from killing keyboard focus.
  touches: StashOf<ScreenSpacePoint> | undefined;
  didTouchMove: boolean = false;
  hashTagTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    this.touches = getTouches(e);
    this.didTouchMove = false;
  }

  hashTagTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!this.touches) {
      return;
    }
    const newTouches = getTouches(e);
    for (const touchID in this.touches) {
      const start = this.touches[touchID];
      const cur = newTouches[touchID];
      if (!cur) {
        continue;
      }
      const xDiff = cur.x - start.x;
      const yDiff = cur.y - start.y;
      if (xDiff * xDiff + yDiff * yDiff > TOUCH_DIST_SQRD) {
        this.didTouchMove = true;
      }
    }
  }

  genHashTagFunc = (tag: string): ((e: React.SyntheticEvent<HTMLElement>) => void) => {
    // Must be onTouchEnd so preventdefault can prevent focus loss on keyboard.
    return (e: React.SyntheticEvent<HTMLElement>) => {
      this.touches = undefined;
      e.preventDefault();
      if (!this.didTouchMove) {
        this.setState({noteValue: (this.state.noteValue) + '#' + tag + ' '});
      }
    };
  }

  render() {
    const fontSizeStr = this.getData(['vrsettings', 'fontSize']);
    const fontSize = ReaderStyle.FONT_SIZES[fontSizeStr] * 1.2;
    const alpha = this.context.readerContext.getUIAlpha(this);

    const groupID = this.context.readerContext.getGroupID();
    const commentColor = UserColors.getUserColor(this, groupID, DB.getAccountID()).inlineBase;

    const hashTags: HashTagButton[] = [];
    for (let i = 0; i < this.hashTagSet.length; ++i) {
      hashTags.push({
        tag: this.hashTagSet[i].tag,
        onTouchEnd: this.genHashTagFunc(this.hashTagSet[i].tag),
      });
    }

    const context: NoteContext = {
      setNote: this.setNote,
      note: this.state.noteValue,
      save: this.save,
      showSave: this.state.origValue !== this.state.noteValue,
      cancel: this.cancel,
      delete: this.delete,
      showDelete: Boolean(this.state.origValue),
      color: commentColor,
      fontSize: fontSize,
      onTouchStart: this.hashTagTouchStart,
      onTouchMove: this.hashTagTouchMove,
      hashTags: hashTags,
    };

    return (<div style={{opacity: alpha}}><FixedTemplate template='ReaderNote' context={context} /></div>);
  }
}

registerContextSchema(module, 'ReaderNote', ReaderNote.contextSchema, ReaderNote.sampleContext);
