/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import * as Nav from 'clientjs/components/CanvasReader/Nav';
import { NavTargetComment } from 'clientjs/components/CanvasReader/Nav';
import * as PageCountUtils from 'clientjs/components/CanvasReader/PageCountUtils';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { registerContextSchema, FixedTemplate } from 'clientjs/components/FixedTemplate';
import { ReaderLocationsEntry, RLE, RLEToc, RLEComment, RLEPreview, RLEMyLocation }
  from 'clientjs/components/Reader/Locations/ReaderLocationsEntry.tsx';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import * as KnownData from 'clientjs/KnownData';
import { SentenceSchema, ReactionSchema, CommentEntry } from 'clientjs/shared/reactionGroupDB';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as moment from 'moment';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as Log from 'overlib/client/log';
import { ComponentMap } from 'overlib/client/template/Component';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const CONTACT_MASK = Object.freeze({
  name: 1,
});

const BASE_CHARS_MASK = Object.freeze({
  baseCharsSoFar: 1,
});

const THREADS_MASK = Util.objectMakeImmutable({
  _ids: {
    sentences: {
      _ids: {
        modTime: 1,
        lastRead: 1,
        reactions: {
          _ids: {
            userID: {
              _ids: {
                modTime: 1,
                count: 1,
              },
            },
          },
        },
        comments: {
          _ids: {
            createTime: 1,
            text: 1,
            userID: 1,
          },
        },
      },
    },
  },
});


interface ReaderLocationsContext {
  entries: RLE[];
}

/* not currently used
function sortByModTime(a: RLEComment, b: RLEComment) {
  return a.modTime - b.modTime;
}
*/

function sortByBaseChars(a: RLE, b: RLE) {
  return a.baseCharsSoFar - b.baseCharsSoFar;
}

function findRLETocContainingBaseChar(entries: RLEToc[], baseChar: number): RLEToc | undefined {
  if (!entries.length) {
    return undefined;
  }
  let bestEntry = entries[0];
  for (const entry of entries) {
    if (entry.baseCharsSoFar < baseChar) {
      bestEntry = entry;
    }
  }
  return bestEntry;
}

function countReactions(reactions: StashOf<ReactionSchema>): number {
  let count = 0;
  for (const reactionID in reactions) {
    const reaction: ReactionSchema = reactions[reactionID];
    for (const userID in reaction.userID) {
      const perUser = reaction.userID[userID];
      count += (perUser.count || 0);
    }
  }
  return count;
}

export class ReaderLocations extends DataWatcher<{location?: string}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  static contextSchema: StashOf<Types.Schema> = {
    entries: ObjSchema.ARRAY_OF(Types.OBJECT),
  };

  static sampleContext: Stash = {
    entries: [
      {type: 'toc'},
      {type: 'toc'},
    ],
  };

  static customComponents = new ComponentMap({
    ReaderLocationsEntry: new ReaderLocationsEntry(),
  });

  componentDidMount() {
    if (this.props.location === 'locations' || this.props.location === 'newComments') {
      this.context.readerContext.toggleToc();
      if (this.props.location === 'newComments') {
        this.context.readerContext.replaceUIState(['viewNewComments'], true);
      }
    }
    this.scrollToCenter();
  }

  private scrollToCenter = () => {
    const locationsEl = document.getElementById('readerLocations');
    const beforeEl = document.getElementById('beforeMyLocation');
    const myEl = document.getElementById('myLocation');
    if (!locationsEl) {
      Log.warn('@palmer', 'no readerLocations id element');
      return;
    }
    if (!beforeEl) {
      Log.warn('@palmer', 'no beforeMyLocation id element');
      return;
    }
    if (!myEl) {
      Log.warn('@palmer', 'no myLocation id element');
      return;
    }
    if (beforeEl === myEl) {
      return;
    }
    const rect = beforeEl.getBoundingClientRect();
    locationsEl.scrollTop = Math.max(0, rect.bottom - locationsEl.clientHeight / 2
      - LAYOUT_CONSTANTS.TOP_BAR_HEIGHT / 2 - myEl.clientHeight / 2);
  }

  private genNavFunctionToEntryIdx = (entryIdx: number): (() => void) => {
    const target: Nav.NavTargetParagraph = {
      type: 'paragraph',
      entryIdx: entryIdx,
    };
    return () => {
      this.context.readerContext.navTo && this.context.readerContext.navTo(target, Nav.NAV_PLACEMENT.TOP, false, 'nav.TocEntry');
    };
  }

  private genNavFunctionToComment = (target: NavTargetComment): (() => void) => {
    return () => {
      this.context.readerContext.setQuietMode(false);
      this.context.readerContext.navTo && this.context.readerContext.navTo(target, Nav.NAV_PLACEMENT.TOP, false, 'nav.CommentEntry');
    };
  }

  private genNavFunctionToFurthestLocation = () => {
    const maxChars = this.context.readerContext.getVRData(this, ['positions', 'max', 'totalCharacters']);
    const paraID = this.context.readerContext.getParagraphByCharCount(maxChars);
    if (paraID === undefined) {
      Log.warn('@palmer', 'Current reading location did not have paraID');
      return () => {};
    }
    const entryIdx: number | undefined = this.context.readerContext.getEntryIdxFromElementID(paraID);
    if (entryIdx === undefined) {
      Log.warn('@palmer', 'Current reading Location did not have entryIdx');
      return () => {};
    }
    const target: Nav.NavTargetParagraph = {
      type: 'paragraph',
      entryIdx: entryIdx,
    };
    return () => {
      this.context.readerContext.navTo && this.context.readerContext.navTo(target, Nav.NAV_PLACEMENT.TOP, false, 'nav.TocEntry');
    };
  }

  private showSpoilerModal = () => {
    const preventSpoilers = this.context.readerContext.getUIState(this, ['preventSpoilers']);
    GlobalModal.openModal('ReaderModal', {
      header: 'Turn Spoiler Prevention ' + (preventSpoilers ? 'Off? ' : 'On? '),
      text: 'Spoiler prevention blurs comments that are past your furthest reading point, ' +
        'so your friends\' comments won\'t give away any spoilers.',
      textClasses: 'ta-c fs-16',
      showOK: true,
      showCancel: true,
      onOK: () => {
        this.togglePreventSpoilers();
        GlobalModal.closeModal('preventSpoilers');
      },
    });
  }

  private togglePreventSpoilers = () => {
    const spoiler = this.context.readerContext.getUIState(null, ['preventSpoilers']);
    this.context.readerContext.replaceUIState(['preventSpoilers'], !spoiler);
  }

  private genNavFunctionToParaID = (paraID: string): (() => void) => {
    const entryIdx: number | undefined = this.context.readerContext.getEntryIdxFromElementID(paraID);
    if (entryIdx === undefined) {
      Log.error('@sam', 'Unable to find entry idx for paraID:', {paraID});
      return () => {};
    }
    return this.genNavFunctionToEntryIdx(entryIdx);
  }

  private getTocEntries = (): RLEToc[] => {
    const rawParsedData = this.context.readerContext.getRawParsedData();

    // Add a pseudo-entry for the cover
    const coverEntry: RLEToc = {
      type: 'toc',
      text: 'Cover',
      isSection: false,
      onClick: this.genNavFunctionToEntryIdx(0),
      firstPage: 1,
      numPages: 0,
      numReactions: 0,
      baseCharsSoFar: 0,
      scrollMarkId: '',
    };
    const entries: RLEToc[] = [coverEntry];

    // Add each toc entry from the parsed data
    for (const tocEntry of rawParsedData.toc) {
      // Only support chapter and section for now
      if (tocEntry.type !== 'chapter' && tocEntry.type !== 'section') {
        continue;
      }
      const entry: RLEToc = {
        type: 'toc',
        text: tocEntry.snippet[0] || '',
        isSection: (tocEntry.type === 'section'),
        onClick: this.genNavFunctionToParaID(tocEntry.paraID),
        firstPage: PageCountUtils.baseCharsToPages(tocEntry.baseCharsSoFar),
        numPages: 0,
        numReactions: 0,
        baseCharsSoFar: tocEntry.baseCharsSoFar,
        scrollMarkId: '',
      };
      entries.push(entry);
    }

    // loop over the entries backwards and calculate length
    let lastChar = this.context.readerContext.getParsedData(this, ['totalBaseChars']);
    for (let i = entries.length - 1; i >= 0; --i) {
      const entry = entries[i];
      entry.numPages = Math.max(PageCountUtils.baseCharsToPages(lastChar - entry.baseCharsSoFar), 1);
      lastChar = entry.baseCharsSoFar;
    }

    return entries;
  }

  private markPositionBeforeMyLocation = (entries: RLE[]) => {
    let lastEntry;
    if (!entries.length) {
      Log.error('@palmer', 'Empty TOC entries');
      return;
    }
    for (const entry of entries) {
      if (entry.type === 'myLocation') { break; }
      lastEntry = entry;
    }
    if (!lastEntry) {
      // use top if myLocation is first element or no myLocaiton
      lastEntry = entries[0];
    }
    lastEntry.scrollMarkId = 'beforeMyLocation';
  }

  private getCommentEntries = (newOnly: boolean, tocEntries?: RLEToc[], isPreview?: boolean): RLEComment[] => {
    const threads = this.context.readerContext.getReactionGroupData(this, ['threads'], THREADS_MASK);
    const commentEntries: RLEComment[] = [];
    const maxSeenChars = this.context.readerContext.getVRData(null, ['positions', 'maxSeen', 'totalCharacters']);
    for (let pID in threads) {
      // get sentence location, create entry in toc
      const entryKey = this.context.readerContext.getEntryIdxFromElementID(pID);
      let baseCharsSoFar: number;
      if (entryKey === undefined) {
        if (isPreview) {
          // do not actually know where they are, so just throw them to the end.
          baseCharsSoFar = 1e10; // infinity not allowed
        } else {
          continue;
        }
      } else {
        const entry = this.context.readerContext.getEntry(this, entryKey, BASE_CHARS_MASK);
        baseCharsSoFar = entry.baseCharsSoFar;
      }

      // The corresponding tocEntry, which may not exist
      const tocEntry: RLEToc | undefined = tocEntries ? findRLETocContainingBaseChar(tocEntries, baseCharsSoFar) : undefined;

      const sentenceArray : SentenceSchema[] = Util.objToArray(threads[pID].sentences);

      const previouslyOpened: number = this.context.readerContext.getUIState(this, ['previouslyOpened'], 1) || -Infinity;

      for (let sentenceIndex = 0; sentenceIndex < sentenceArray.length; sentenceIndex++) {
        const sentence = sentenceArray[sentenceIndex];
        // Add reaction counts to toc entry if we care
        if (tocEntry) {
          tocEntry.numReactions += countReactions(sentence.reactions);
        }


        // Check out comments for beeped status, whether they even exist, and finding the first one
        let isBeeped = false;
        let isNew = false;
        let numComments = 0;
        let earliestCreateTime = Infinity;
        let lastCreateTime = 0;
        let firstComment: CommentEntry | undefined;
        let targetCommentID;
        for (let c in sentence.comments) {
          const comment = sentence.comments[c];
          numComments++;
          if (comment.createTime > previouslyOpened) {
            isNew = true;
          }
          if (comment.createTime > sentence.lastRead) {
            isBeeped = true;
          }
          if (comment.createTime > lastCreateTime) {
            lastCreateTime = comment.createTime;
          }
          if (comment.createTime < earliestCreateTime) {
            firstComment = comment;
            earliestCreateTime = comment.createTime;
            targetCommentID = c;
          }
        }

        // doesn't actually have any comments
        if (!numComments) {
          continue;
        }

        if (newOnly && !isNew && !isBeeped) {
          continue;
        }

        if (!firstComment) {
          Log.error('@sam', 'Somehow didnt find a comment', {comments: sentence.comments});
          continue;
        }

        let userName: string = 'unknown';
        const accountID = DB.getAccountID();
        if (accountID === firstComment.userID) {
          userName = 'you';
        } else {
          const commenter = KnownData.getKnownInfo(this, 'contacts', firstComment.userID, CONTACT_MASK);
          if (commenter) {
            userName = commenter.name;
          }
        }

        let onClick: () => void;
        if (entryKey !== undefined) {
          const navTarget: NavTargetComment = {
            type: 'comment',
            entryIdx: entryKey,
            threadId: pID,
            sentenceIdx: sentenceIndex,
            commentID: targetCommentID,
          };
          onClick = this.genNavFunctionToComment(navTarget);
        } else {
          onClick = () => {};
        }
        const commentEntry: RLEComment = {
          type: 'comment',
          baseCharsSoFar: baseCharsSoFar,
          modTime: sentence.modTime,

          text: firstComment.text,
          textColor: UserColors.getUserColor(this, this.context.readerContext.getGroupID(), firstComment.userID).inlineBase,
          userName: userName,
          onClick: onClick,
          isBeeped: isBeeped,
          firstPage: PageCountUtils.baseCharsToPages(baseCharsSoFar),
          numResponses: numComments - 1,
          whenText: moment(lastCreateTime).fromNow(),
          blurred: entryKey === undefined ||
            (baseCharsSoFar > maxSeenChars && this.context.readerContext.getUIState(this, ['preventSpoilers'])),
          scrollMarkId: '',
        };
        commentEntries.push(commentEntry);
      }
    }
    return commentEntries;
  }

  private myLocationEntry : () => RLEMyLocation = () => {
    const baseCharsSoFar = this.context.readerContext.getVRData(null, ['positions', 'max', 'totalCharacters']);
    return {
      type: 'myLocation',
      baseCharsSoFar,
      firstPage: Math.max(PageCountUtils.baseCharsToPages(baseCharsSoFar), 1),
      onClick: this.genNavFunctionToFurthestLocation(),
      scrollMarkId: '',
    };
  }

  render() {
    this.setWatchingEnabled(true);
    const renderLocations = Boolean(this.context.readerContext.getUIState(this, ['renderLocations']));
    this.setWatchingEnabled(renderLocations);

    const viewNewComments = this.context.readerContext.getUIState(this, ['viewNewComments']);
    const isPreview = this.context.readerContext.getParsedData(this, ['isPreview']) || false;
    let previewInsert: RLEPreview | undefined;
    if (isPreview) {
      previewInsert = {
        type: 'preview',
        baseCharsSoFar: this.context.readerContext.getParsedData(this, ['totalBaseChars']) || Infinity,
      };
    }

    let entries: RLE[];
    if (viewNewComments) {
      entries = this.getCommentEntries(true, undefined, isPreview);
    } else {
      entries = this.getTocEntries();
      entries = entries.concat(this.getCommentEntries(false, entries as RLEToc[], isPreview));
    }
    if (previewInsert) {
      entries.push(previewInsert);
    }
    entries.push(this.myLocationEntry());
    entries.sort(sortByBaseChars);

    this.markPositionBeforeMyLocation(entries);

    const context: ReaderLocationsContext = {
      entries: entries,
    };
    const preventSpoilers = this.context.readerContext.getUIState(this, ['preventSpoilers']);
    const buttonClasses =
      'trans-col-bc-.3s c-readerFrameBorder-b c-readerFrameButtonBG-bg ' +
      'b-1 br-6 p-6 ai-c jc-c b-1 ' +
      (preventSpoilers ? 'c-readerFrameButtonSelectedFG-fg c-readerFrameButtonSelected-b c-readerFrameButtonSelected-bg' : '');
    return (
      <Flex.Col classes='pos-a fullSize'>
        <FixedTemplate template='ReaderLocations' context={context} />
        <Flex.Col classes='m-18 pos-a bot-0 right-0 fs-13 ta-l lh-1'>
          <Flex.Row classes={buttonClasses} onClick={this.showSpoilerModal}>
            Spoiler Prevention: {preventSpoilers ? 'On' : 'Off'}
          </Flex.Row>
        </Flex.Col>
      </Flex.Col>
    );
  }
}

registerContextSchema(module, 'ReaderLocations', ReaderLocations.contextSchema, ReaderLocations.sampleContext, ReaderLocations.customComponents);
