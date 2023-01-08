/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { LayoutTrackerSentence } from 'clientjs/components/CanvasReader/LayoutTracker';
import * as Nav from 'clientjs/components/CanvasReader/Nav';
import * as ParagraphUtils from 'clientjs/components/CanvasReader/ParagraphUtils';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import * as AlertUtils from 'clientjs/components/ReaderApp/alertUtils';
import { PostPurchaseModal } from 'clientjs/components/ReaderApp/PostPurchaseModal.tsx';
import * as ReaderFTEModal from 'clientjs/components/ReaderUI/ReaderFTEModal.tsx';
import * as GroupUtils from 'clientjs/groupUtils';
import * as ManuscriptInfo from 'clientjs/manuscriptInfo';
import * as Constants from 'clientjs/shared/constants';
import { EntryTypes } from 'clientjs/shared/readerParse';
import { purchaseSku } from 'clientjs/skuUtils';
import * as CanvasRenderer from 'overlib/client/components/Layout/CanvasRenderer';
import * as Jobs from 'overlib/shared/jobs';
import { MS_PER_MINUTE } from 'overlib/shared/time';

import {
  CanvasTouchEvent,
  CanvasTouchEventCallback,
  ContentPosition,
  FullContentPosition,
  PosType,
  TOC_CONTAINER_ID,
  TOC_MENU_BAR_ID,
} from 'clientjs/components/CanvasReader/CanvasConstants';
import * as PageCountUtils from 'clientjs/components/CanvasReader/PageCountUtils';
import { ReaderReactions } from 'clientjs/components/CanvasReader/ReaderReactions';
import * as ReaderStyle from 'clientjs/components/CanvasReader/ReaderStyle';
import { LAYOUT_CONSTANTS, FontSize } from 'clientjs/components/CanvasReader/ReaderStyle';
import * as RenderData from 'clientjs/components/CanvasReader/RenderData';
import * as UIState from 'clientjs/components/CanvasReader/UIState';
import { NoteButtonID } from 'clientjs/components/CanvasReader/UIState';
import * as DB from 'clientjs/db';
import { vrDataSetPosition } from 'clientjs/db'; // todo: kill with fire
import * as Keyboard from 'clientjs/keyboard';
import * as Metrics from 'clientjs/metrics';
import * as ReaderParse from 'clientjs/shared/readerParse';
import * as Util from 'overlib/client/clientUtil';
import { LayoutNode } from 'overlib/client/components/Layout/LayoutNode';
import { ScrollEventData } from 'overlib/client/components/Layout/MomentumScroller';
import * as Log from 'overlib/client/log';
import * as DataMemoize from 'overlib/shared/dataMemoize';
import * as DataStore from 'overlib/shared/dataStore';
import { WatcherOpt } from 'overlib/shared/dataStore';
import * as DataStoreWatch from 'overlib/shared/dataStoreWatch';
import * as MathUtils from 'overlib/shared/mathUtils';
import * as Sketch from 'overlib/shared/sketch';
import { ReaderColor, READER_COLOR } from 'clientjs/shared/constants';

GlobalModal.registerGlobalModal(module, 'PostPurchaseModal', PostPurchaseModal);

const SKU_MASK = Util.objectMakeImmutable({
  title: 1,
  subtitle: 1,
});

const ENTRY_CHAR_MASK = Util.objectMakeImmutable({
  baseCharsSoFar: 1,
});


// Masson (1979), Carver (1992) papers finds skimming speeds to range from 450+ wpm (~2700 char per min) among college lvl readers.
const MAX_READING_SPEED = 2700;
// Taylor et al (1960) survey found avg 1st grade reading speed to be 80 wpm (~480 charpm).
const MIN_READING_SPEED = 480;

const gFiveMinutesAgo = 5 * MS_PER_MINUTE;

export let GLOBAL_CONTEXT_COUNT: number = 0;

const getEntrySelection = DataMemoize.memoize(function(watcher: DataStore.Watcher, id: string, entryIdx: string) {
  const selection = DataStore.getData(watcher, ['UIState', id, 'selection'], '*');
  if (selection && selection.entryIdx === entryIdx) {
    return selection;
  }
  return undefined;
});

interface Trigger {
  chars: number;
  cb: () => void;
}

function cmpChars(a: Trigger, b: Trigger) {
  return Util.cmpNum(false, a.chars, b.chars);
}

// This is the global context that all canvas reader objects might have access to. Id is used to index into the data stores
export class ReaderContext {
  private id: string;
  private eventCallbacks: StashOf<(CanvasTouchEventCallback)[]>;
  private sessionStartTime: string;
  private currentProgress: number;
  private paragraphIDToEntryIdx: StashOf<number>;
  private parsedData: ReaderParse.ParsedData;
  private seenAllFTEs: boolean;
  public speedStartPos: number;
  public speedStartTime: number;
  public readerReactions: ReaderReactions;
  public setTargetScaleFactor: ((scaleFactor: number) => void) | undefined;
  public getBookEdgeBeginning: (() => number | null) | undefined;
  public autoSelectSentence: (activeBar?: string) => boolean = () => { return false; }; // will be overridden
  public getSentenceClosestToMiddle: () => LayoutTrackerSentence | undefined = () => { return undefined; }; // will be overridden
  public navTo: ((target: Nav.NavTarget, placement: Nav.NavPlacement, instant: boolean, metric?: string) => void) | undefined;
  public getContentPosition: (isContentWindow?: boolean) => FullContentPosition | null;
  public getOverlayParent: () => LayoutNode | null;
  public getUXOverlayParent: () => LayoutNode | null;

  private layoutNodeMap: StashOf<LayoutNode> = {};
  private postLayoutCBs: (() => void)[] = [];
  private positionWatcher: DataStoreWatch.WatcherHandle;
  private triggers: Trigger[];

  private previewMetricRecorded: boolean = false;
  constructor(readonly bookID: Constants.BookID, readonly groupID: Constants.ReactionGroupID, parsedData: ReaderParse.ParsedData) {
    this.id = (++GLOBAL_CONTEXT_COUNT).toString();
    this.eventCallbacks = {};
    this.readerReactions = new ReaderReactions(this);
    this.speedStartPos = 0;
    this.speedStartTime = 0;
    this.seenAllFTEs = false;

    GroupUtils.init(groupID, parsedData);
    DB.vrDataCreate(bookID);
    const {hasButtons} = RenderData.initDataStore(this.id, parsedData); // TODO: need to cache styling somewhere eventually
    UIState.initDataStore(this.id, hasButtons);

    const lastOpened = this.getReactionGroupData(null, ['userID', DB.getAccountID(), 'lastOpened']);
    if (lastOpened) {
      this.replaceUIState(['previouslyOpened'], lastOpened);
    }

    this.parsedData = parsedData; // for speedy access
    Sketch.runAction('vrdata.setAllCharCount', this.bookID, parsedData.totalChars); // record for lookup outside of the book
    this.paragraphIDToEntryIdx = {};
    for (let entryIdx = 0; entryIdx < parsedData.entries.length; ++entryIdx) {
      const entry = parsedData.entries[entryIdx];
      if (entry.type !== EntryTypes.paragraph) {
        continue;
      }
      this.paragraphIDToEntryIdx[entry.id] = entryIdx;
    }

    this.sessionStartTime = String(Date.now());
    this.currentProgress = this.getVRData(null, ['positions', 'maxSeen', 'totalCharacters']);

    // Parse triggers
    this.triggers = [];
    for (const entry of parsedData.entries) {
      if (entry.type !== EntryTypes.button) {
        continue;
      }

      this.triggers.push({
        chars: entry.charsSoFar,
        cb: this.enableButtonCBGenerator(entry),
      });
    }

    this.triggers.sort(cmpChars);
    this.positionWatcher = DataStoreWatch.createDataReactor(0, this.positionUpdated, false);

    GroupUtils.updateActivity(this.groupID, this.bookID);

    this.recordMetric('analytics.reader.visitManuscript', {
      lastOpened: Date.now(),
    });

    AlertUtils.seenAlertComment(bookID, groupID);

    Keyboard.registerOpenedHandler('readerContext-' + this.id, this.handleKeyboardResize);
  }

  private handleKeyboardResize = (openedData: Stash) => {
    this.replaceUIState(['keyboardHeight'], openedData.height);
  }

  public getRawParsedData = () => {
    return this.parsedData;
  }

  public openLightbox(entryIdx: number, imageIdx: number) {
    this.replaceUIState(['lightboxImageIndex'], imageIdx);
    this.replaceUIState(['lightboxImagesEntryIndex'], entryIdx);
  }

  public closeLightbox() {
    this.replaceUIState(['lightboxImagesEntryIndex'], null);
  }

  public getFontSize(watcher: WatcherOpt): number {
    const fontSizeStr = DataStore.getData(watcher, ['vrsettings', 'fontSize']);
    return ReaderStyle.FONT_SIZES[fontSizeStr];
  }

  public getFontStyle(watcher: WatcherOpt, type: string): React.CSSProperties {
    const fontSizeStr = DataStore.getData(watcher, ['vrsettings', 'fontSize']) as FontSize;
    return ReaderStyle.getFontStyle(type, fontSizeStr);
  }

  public destructor = () => {
    UIState.cleanUpDataStore(this.id);
    RenderData.cleanUpDataStore(this.id);
    DataStoreWatch.destroyDataReactor(this.positionWatcher);
    Keyboard.deregisterOpenedHandler('readerContext-' + this.id);
  }

  public getBookID = () => {
    return this.bookID;
  }

  public getDistributionID = (): Constants.DistributionID => {
    return Constants.extractChannelID(this.bookID);
  }

  public getContentItemData = (watcher: DataStore.WatcherOpt, path: string[], objMask?: any) => {
    const ids = Constants.splitBookID(this.bookID);
    return DataStore.getData(watcher, ['distributions', ids[0], 'items', ids[1]].concat(path), objMask);
  }

  public getGroupID = () => {
    return this.groupID;
  }

  public getReaderDocType = (): Constants.ReaderDocType => {
    const distID = this.getDistributionID();
    switch (distID) {
      case Constants.WRITER_PREVIEW_CHANNEL:
        return Constants.READER_DOC_TYPE.PREVIEW;
      case Constants.MOBILE_WRITER_CHANNEL:
      return Constants.READER_DOC_TYPE.WRITER;
    }
    return Constants.READER_DOC_TYPE.PUBLISHED;
  }

  public replaceUIState = (path: string[], data: any) => {
    DataStore.replaceData(['UIState', this.id].concat(path), data);
  }
  public removeUIState = (path: string[]) => {
    DataStore.removeData(['UIState', this.id].concat(path));
  }
  public getUIState = (watcher: DataStore.WatcherOpt, path: string[], objMask?: any): any => {
    return DataStore.getData(watcher, ['UIState', this.id].concat(path), objMask);
  }
  public getEntrySelection = (watcher: DataStore.WatcherOpt, entryIdx: string): UIState.ReaderSelection | undefined => {
    return getEntrySelection(watcher, this.id, entryIdx);
  }
  public getSelection(watcher: DataStore.WatcherOpt): UIState.ReaderSelection {
    return this.getUIState(watcher, ['selection']);
  }
  public replaceRenderData = (path: string[], data: any) => {
    DataStore.replaceData(['RenderData', this.id].concat(path), data);
  }
  public upsertRenderData = (path: string[], data: any) => {
    DataStore.upsertData(['RenderData', this.id].concat(path), data);
  }
  public removeRenderData = (path: string[]) => {
    DataStore.removeData(['RenderData', this.id].concat(path));
  }
  public getRenderData = (watcher: DataStore.WatcherOpt, path: string[], objMask?: any): any => {
    return DataStore.getData(watcher, ['RenderData', this.id].concat(path), objMask);
  }
  public getParsedData = (watcher: DataStore.WatcherOpt, path: string[], objMask?: any): any => {
    return DataStore.getData(watcher, ['RenderData', this.id, 'parsedData'].concat(path), objMask);
  }
  // objmask is required for any entry because they can get arbitrarily large
  public getEntry = (watcher: DataStore.WatcherOpt, entityIdx: number, objMask: any): any => {
    return this.getParsedData(watcher, ['entries', entityIdx.toString() ], objMask);
  }
  public getReactionGroupData = (watcher: DataStore.WatcherOpt, path: string[], objMask?: any) => {
    return GroupUtils.getReactionGroupData(watcher, this.groupID, this.bookID, path, objMask);
  }
  public getReactionGroupMemberIDs = (watcher: DataStore.WatcherOpt) => {
    return GroupUtils.getMemberIDs(watcher, this.groupID);
  }
  public getReactionGroupMemberListModTime = (watcher: DataStore.WatcherOpt) => {
    return GroupUtils.getMemberListModTime(watcher, this.groupID);
  }
  public getReactionGroupMemberListDisplayTime = (watcher: DataStore.WatcherOpt) => {
    return GroupUtils.getMemberListDisplayTime(watcher, this.groupID);
  }
  public setReactionGroupMemberListDisplayTime = () => {
    GroupUtils.setMemberListDisplayTime(this.groupID);
  }
  private setReactionGroupProgressChars = (chars: number) => {
    GroupUtils.setProgressChars(this.groupID, this.bookID, this.sessionStartTime, chars);
  }
  public getReactionGroupHashTags = (watcher: DataStore.WatcherOpt) => {
    return GroupUtils.getHashTags(watcher, this.groupID);
  }
  public updatePos = (chars: number) => {
    GroupUtils.updatePos(this.groupID, this.bookID, chars);
  }
  public getReaderSettingsData = (watcher: DataStore.WatcherOpt, path: string[], objMask?: any): any => {
    return DataStore.getData(watcher, ['settingsGlobal', 'reader'].concat(path), objMask);
  }
  public getVRData = (watcher: DataStore.WatcherOpt, path: string[]): any => {
    return DataStore.getData(watcher, ['vrdata', this.bookID].concat(path));
  }
  public setVRDataPosition = (type: PosType, contentPos: ContentPosition) => {
    const entry = this.getParsedData(null, ['entries', contentPos.entryIdx], ENTRY_CHAR_MASK);
    vrDataSetPosition(this.bookID, type, contentPos.paragraphID, entry.baseCharsSoFar + contentPos.charIdx, contentPos.charIdx, contentPos.charIdx);
  }
  public updateSpeedData = (speed: number, endPos: number, dPos: number): void => {
    const startTime = Date.now();
    const inLocations = this.getUIState(null, ['scaleFactor']) === LAYOUT_CONSTANTS.MIN_SCALE_FACTOR;

    if (inLocations || speed > MAX_READING_SPEED) {
      this.recordMetric('speed.skimmed', {
        speed,
        charsTraveled: dPos,
      });
      this.speedStartPos = endPos;
      this.speedStartTime = startTime;
      return;
    }

    if (speed < MIN_READING_SPEED) {
      this.speedStartPos = endPos;
      this.speedStartTime = startTime;
      return;
    }

    const eventCount: number = this.getVRData(null, ['speed', 'eventCount']);
    const avgSpeed = ((this.getVRData(null, ['speed', 'avgSpeed']) * eventCount) + speed) / (eventCount + 1);
    Sketch.runAction('vrdata.updateAvgSpeed', this.bookID, eventCount + 1, avgSpeed);
    this.recordMetric('speed.read', {
      speed,
      avgSpeed,
      charsTraveled: dPos,
    });
  }
  private positionUpdated = (watcher: DataStore.WatcherOpt) => {
    const maxSeen = this.getVRData(watcher, ['positions', 'maxSeen', 'totalCharacters']);
    // Triggers are sorted by chars, so shift off the front until we get to one that we haven't reached (or we run out)
    while (this.triggers.length && maxSeen >= this.triggers[0].chars) {
      this.triggers[0].cb();
      this.triggers.shift();
    }

    // update session position
    if (maxSeen > this.currentProgress) {
      this.setReactionGroupProgressChars(maxSeen);
      this.currentProgress = maxSeen;
    }
  }
  private enableButtonCBGenerator = (button: ReaderParse.ButtonEntry): (() => void) => {
    const buttonID = button.name.split(']')[0];
    return () => {
      if (this.isWorkshop(null)) {
        Log.info('enabling ' + buttonID);
        this.replaceRenderData(['reactions', buttonID, 'enabled'], true);
      }
    };
  }

  public getEntryIdxFromElementID = (paraID: string): number | undefined => {
    return this.paragraphIDToEntryIdx[paraID];
  }
  public getParagraphIDFromEntryIdx = (entryIdx: number | string): string | null => {
    return this.getParsedData(null, ['entries', entryIdx.toString(), 'id']);
  }
  public getParagraphContent = (paraID: string) => {
    const entryIdx = this.paragraphIDToEntryIdx[paraID];
    if (entryIdx === undefined) {
      return '';
    }
    const entry = this.getRawParsedData().entries[entryIdx];
    if (entry.type !== EntryTypes.paragraph) {
      return '';
    }
    return entry.content;
  }
  public getUIAlpha = (watcher: any) => {
    const scaleFactor = this.getUIState(watcher, ['scaleFactor']);
    if (scaleFactor < 1) {
      return MathUtils.clamp(0, 1, MathUtils.parameterize(0.60, 1, scaleFactor));
    } else {
      return 1;
    }
  }
  public calcBottomUXOffset = (watcher: WatcherOpt) => {
    return UIState.calcBottomUXOffset(this.id, watcher);
  }


  public getCharByParaID = (paraID: string): number | undefined => {
    const entryIdx = this.paragraphIDToEntryIdx[paraID];
    if (entryIdx === undefined) {
      return;
    }
    return this.getParsedData(null, ['entries', entryIdx.toString(), 'charsSoFar']);
  }

  public getParagraphByCharCount = (charCount): string | undefined => {
    let lastParaID: string | undefined;
    for (const entry of this.parsedData.entries) {
      if (entry.type !== EntryTypes.paragraph) {
        continue;
      }
      if (charCount < entry.charsSoFar) {
        // use first para if char count is less than first
        if (!lastParaID) { lastParaID = entry.id; }
        return lastParaID;
      }
      lastParaID = entry.id;
    }
    return lastParaID;
  }

  public getCurrentPage = (watcher: DataStore.WatcherOpt): number => {
    const chars = this.getVRData(watcher, ['positions', 'current', 'totalCharacters']);
    return Math.max(PageCountUtils.baseCharsToPages(chars), 1);
  }

  public getContentWindowPage = (watcher: DataStore.WatcherOpt): number => {
    const chars = this.getVRData(watcher, ['positions', 'currentWindow', 'totalCharacters']);
    return Math.max(PageCountUtils.baseCharsToPages(chars), 1);
  }

  public registerLayoutID = (id: string, node: LayoutNode | null) => {
    if (!node) {
      delete this.layoutNodeMap[id];
    } else {
      this.layoutNodeMap[id] = node;
    }
  }

  public getSelectedThread(): LayoutNode | undefined {
    return this.layoutNodeMap.selectedThread;
  }

  //TODO: generalize this to general event system if needed
  public registerEventCallback(event: CanvasTouchEvent, cb: CanvasTouchEventCallback) {
    if (!this.eventCallbacks[event]) {
      this.eventCallbacks[event] = [];
    }
    this.eventCallbacks[event].push(cb);
  }

  public unregisterEventCallback(event: CanvasTouchEvent, cb: CanvasTouchEventCallback) {
    const cbs = this.eventCallbacks[event];
    if (!cbs || !cbs.length || cbs.indexOf(cb) < 0) {
      Log.warn('@palmer', 'touch.eventCallback.notFound');
      return;
    }

    this.eventCallbacks[event].splice(cbs.indexOf(cb), 1);
  }

  public callCallbacksForEvent(event: CanvasTouchEvent, scrollData: ScrollEventData) {
    const cbs = this.eventCallbacks[event];
    if (!cbs || !cbs.length) {
      return;
    }
    for (const cb of cbs) {
      cb(scrollData);
    }
  }

  public setScaleFactor = (sf: number): void => {
    const scaleFactor = MathUtils.clamp(LAYOUT_CONSTANTS.MIN_SCALE_FACTOR, 1.0, sf);
    const tocBarSF = 1 - MathUtils.parameterize(LAYOUT_CONSTANTS.MIN_SCALE_FACTOR, 1.0, scaleFactor);
    this.replaceUIState(['scaleFactor'], scaleFactor);
    this.replaceUIState(['showToc'], (scaleFactor < 1));
    const tocElem = document.getElementById(TOC_CONTAINER_ID);
    const tocBarElem = document.getElementById(TOC_MENU_BAR_ID);
    if (tocElem) {
      tocElem.style.webkitTransform = 'translate(' + ((scaleFactor) * 100) + '%)';
    }
    if (tocBarElem) {
      tocBarElem.style.webkitTransform = 'translate(-' + ((tocBarSF) * 100) + '%)';
    }
    const wasInLocations = this.getUIState(null, ['renderLocations']);
    if (!wasInLocations && scaleFactor === LAYOUT_CONSTANTS.MIN_SCALE_FACTOR) {
      this.replaceUIState(['renderLocations'], true);
    } else if (wasInLocations && scaleFactor === 1.0) {
      this.replaceUIState(['renderLocations'], false);
    }
    CanvasRenderer.kickRender();
  }

  public toggleLayers = () => {
    const prevState = DataStore.toggleBool(['UIState', this.id, 'showLayers']);
    if (prevState) {
      this.recordMetric('layerui.off');
    } else {
      this.recordMetric('layerui.on');
    }
  }

  public toggleSettings = () => {
    this.closeGroupMenu();
    const prevState = DataStore.toggleBool(['UIState', this.id, 'showSettings']);
    this.recordMetric(prevState ? 'settings.off' : 'settings.on');
  }

  public toggleGroupMenu = () => {
    this.setSettings(false);
    const prevState = DataStore.toggleBool(['UIState', this.id, 'showGroupMenu']);
    this.recordMetric(prevState ? 'groupMenu.on' : 'groupMenu.off');
  }

  public closeGroupMenu = () => {
    this.replaceUIState(['showGroupMenu'], false);
  }

  public setSettings = (on: boolean) => {
    this.replaceUIState(['showSettings'], on);
  }

  public toggleToc = () => {
    const prevState = DataStore.getData(null, ['UIState', this.id, 'showToc']);
    if (prevState) {
      this.recordMetric('toc.off');
      this.setTargetScaleFactor && this.setTargetScaleFactor(1);
    } else {
      this.recordMetric('toc.on');
      this.setTargetScaleFactor && this.setTargetScaleFactor(LAYOUT_CONSTANTS.MIN_SCALE_FACTOR);
      GroupUtils.updateLastViewedTocTime(this.groupID, this.bookID);
    }
  }

  public setQuietMode = (on: boolean) => {
    const prevState = DataStore.getData(null, ['UIState', this.id, 'quietMode']);
    if (on !== prevState) {
      this.recordMetric(on ? 'quietMode.on' : 'quietMode.off');
      this.replaceUIState(['quietMode'], on);
    }
  }

  public toggleQuietMode = () => {
    const prevState = DataStore.getData(null, ['UIState', this.id, 'quietMode']);
    this.setQuietMode(!prevState);
  }

  public postLayout = ( cb: () => void ) => {
    // TODO: FIX THIS HORRIBLE HACK.
    // the problem is that it's not easy to figure out when a datastore-driven layout change will go into effect
    // so we put an extra RAF or two here
    Util.requestAnimationFrame( () => {
      Util.requestAnimationFrame( () => {
        this.postLayoutCBs.push(cb);
      });
    });
  }

  public processPostLayoutCBs = () => {
    if (!this.postLayoutCBs.length) {
      return;
    }
    for (const cb of this.postLayoutCBs) {
      cb();
    }
    this.postLayoutCBs.length = 0;
  }

  public clearSelection = () =>  {
    this.replaceUIState(['selection'], {
      pID: '',
      entryIdx: '',
      index: -1,
    });
    this.replaceUIState(['showReactionBar'], false);
    this.replaceUIState(['plusButtonOpen'], false);
  }

  public setActiveBar = (id: string) => {
    // sentiment only mode doesn't keep an active bar except note
    if (id === 'sentiment' || !this.isWorkshop(null) && id !== NoteButtonID) {
      return;
    }
    // don't remember note, as there is no escape from it.
    if (id !== NoteButtonID) {
      this.replaceUIState(['lastActiveBar'], id);
    }

    let active = this.getUIState(null, ['activeBar']);
    if (active && id === active) {
      // already active, so close it
      this.removeUIState(['activeBar']);
      this.clearSelection();
    } else {
      // not active, so activate this category
      this.replaceUIState(['activeBar'], id);

      // scroll selected layout to height matching reaction picker
      // our change may change the selected height, so we need to do this after the next layout tick
      this.postLayout(() => {
        this.navTo && this.navTo({
          type: 'selection',
        }, Nav.NAV_PLACEMENT.BOTTOM,
        false,
        'nav.scrollToSelection');
      });
    }
  }

  private getDefaultBar = () => {
    if (this.isWorkshop(null)) {
      return this.getRenderData(null, ['defaultBar']);
    } else {
      const sentiments = this.getRenderData(null, ['sentiments'], Util.IDS_MASK);
      return Object.keys(sentiments)[1];
    }
  }

  public selectSentence = (entryIdx: number, sentenceIdx: number, activeBar?: string) => {
    const entry = this.parsedData.entries[entryIdx];
    let start: number | undefined;
    let length: number | undefined;
    if (entry.type === EntryTypes.paragraph) {
      const s = ParagraphUtils.getSentence(entry.content, sentenceIdx);
      start = s.start;
      length = s.length;
    }

    this.replaceUIState(['selection'], {
      entryIdx: entryIdx.toString(),
      pID: this.getParagraphIDFromEntryIdx(entryIdx),
      index: sentenceIdx,
      start,
      length,
    });
    if (this.isWorkshop(null)) {
      if (activeBar) {
        this.setActiveBar(activeBar);
      } else {
        let lastActiveBar = this.getUIState(null, ['lastActiveBar']) || this.getDefaultBar();
        if (!lastActiveBar) {
          Log.error('@sam', 'No default selection bar!');
          return;
        }
        if (lastActiveBar === NoteButtonID) {
          Log.error('@sam', 'Somehow saved note as last active bar!');
          lastActiveBar = this.getDefaultBar();
        }
        const enabled = this.getRenderData(null, ['reactions', lastActiveBar, 'enabled'], 1);
        if (!enabled) {
          lastActiveBar = NoteButtonID;
        }
        this.setActiveBar(lastActiveBar);
      }
    } else {
      this.replaceUIState(['plusButtonOpen'], true);
      activeBar && this.setActiveBar(activeBar);
    }
  }

  public ensureSelection = (activeBar?: string): boolean => {
    const selection = this.getUIState(null, ['selection', 'entryIdx']);
    if (!selection) {
      // need selection first
      return this.autoSelectSentence(activeBar);
    }
    if (activeBar) {
      this.setActiveBar(activeBar);
    }
    return true;
  }

  public onScrollStart = (scrollIsForSelection: boolean) => {
    // do not put too much here or it will cause unpleasant hitches
    if (!scrollIsForSelection) {
      // Allow scrolling in note mode
      if (this.getUIState(null, ['activeBar'], 1) !== NoteButtonID) {
        this.removeUIState(['activeBar']);
        this.clearSelection();
      }
    }
  }

  private metricsSessionID = 0;
  private lastRecorded = 0;

  public recordMetric = (metric: string, dimensions?: Metrics.Dimensions, value?: number) => {
    const now = Date.now();

    if (now - gFiveMinutesAgo > this.lastRecorded) {
      this.metricsSessionID = now;
    }

    this.lastRecorded = now;
    //Fill in some extra dimentions
    const bookID = Constants.splitBookID(this.getBookID());
    const extraDims = {
      readerSessionID: this.metricsSessionID,
      bookID: bookID[1],
      distributionID: bookID[0],
      versionID: DataStore.getData(null, ['distributions', bookID[0], 'items', bookID[1], 'versionID']),
      groupID: this.getGroupID(),
      curChars: this.getVRData(null, ['positions', 'current', 'totalCharacters']),
      maxChars: this.getVRData(null, ['positions', 'max', 'totalCharacters']),
      currentPage: this.getCurrentPage(null),
    };

    dimensions = Util.copyFields(dimensions, extraDims);

    g_MetricInContext = true;
    Metrics.recordInSet(Metrics.SET.READER.READER, metric, dimensions, value);
    g_MetricInContext = false;
  }

  // intended to be used for this book in preview mode
  public buySku = (skuID: Constants.SkuID) => {
    purchaseSku(this.getDistributionID(), skuID, this.getGroupID(), false, null, (err, result) => {
      if (!err && result) {
        // We've purchased this book, so show the post-purchase modal
        const sku = DataStore.getData(null, ['distributions', this.getDistributionID(), 'skus', skuID], SKU_MASK);
        GlobalModal.openModal('PostPurchaseModal', {
          skuTitle: (sku && sku.title) || '',
          skuSubtitle: (sku && sku.subtitle) || '',
        });
      }
    });
  }

  public isWorkshop(watcher: DataStore.WatcherOpt): boolean {
    return Boolean(this.getUIState(watcher, ['workshopMode'], 1));
  }

  public isPreview(watcher: DataStore.WatcherOpt): boolean {
    if (this.getReaderDocType() !== Constants.READER_DOC_TYPE.PUBLISHED) {
      return false;
    }
    const [distributionID, itemID] = Constants.splitBookID(this.getBookID());
    return Boolean(DataStore.getData(watcher, ['library', distributionID, 'content', itemID, 'preview'], 1, true));
  }

  public getReaderColorMode(watcher: DataStore.WatcherOpt): ReaderColor {
    return DataStore.getData(watcher, ['settingsGlobal', 'reader', 'color'], 1) || READER_COLOR.DARK;
  }

  public recordPreviewMetric() {
    if (!this.isPreview(null)) {
      return;
    }
    if (!this.previewMetricRecorded) {
      this.recordMetric('preview.read');
      this.previewMetricRecorded = true;
    }
  }

  public updateParagraphLastRead = (entryID: string) => {
    GroupUtils.updateParagraphLastRead(this.groupID, this.bookID, entryID);
  }

  public showFTEIfNeeded() {
    if (this.seenAllFTEs) {
      return;
    }

    const REACTION_FTE_MASK = Util.objectMakeImmutable({
      plusButton: 1,
      workshop: 1,
    });
    const fteState = this.getReaderSettingsData(null, ['FTE'], REACTION_FTE_MASK);

    // if seen all ftes, prevent lookup on every scroll stop.
    this.seenAllFTEs = true;
    for (const key in fteState) {
      if (fteState[key] === false) {
        this.seenAllFTEs = false;
      }
    }

    const jobs = new Jobs.Queue();

    if (!fteState.plusButton) {
      jobs.add(next => {
        ReaderFTEModal.openModal({
          showOK: true,
          text: 'Leave reactions while you read by tapping the plus button!',
          textClasses: 'ta-c fw-500 fs-21 m-b-20',
          img: 'FTE/icon_reader_fte-plusbutton.png',
          imgClasses: 'w-150 h-150',
          gradTop: '#42bcb6',
          gradBot: '#4381bf',
          onOK: () => {
            Sketch.runAction('readerSettings.seenFTE', 'plusButton');
            setTimeout(next, 200);
          },
        });
      });
    }
    if (!fteState.workshop && this.isWorkshop(null)) {
      jobs.add(next => {
        ReaderFTEModal.openModal({
          showOK: true,
          header: 'Tap the buttons at the bottom of the book to give the author feedback!',
          headerClasses: 'ta-c fw-500 fs-20 m-b-30',
          img: 'FTE/icon_reader_fte-authorfeedback.png',
          imgClasses: 'h-200',
          gradTop: '#bc427f',
          gradBot: '#53318f',
          onOK: () => {
            Sketch.runAction('readerSettings.seenFTE', 'workshop');
            next();
          },
        });
      });
    }

    jobs.drain(err => {
      if (err) {
        Log.error('@unassigned', 'FTE.modalErr', 'Modal rendered incorrectly' + err);
      }
    });
  }

  public getAuthorName = (watcher: WatcherOpt): string => {
    switch (this.getReaderDocType()) {
      case Constants.READER_DOC_TYPE.PUBLISHED:
        return DataStore.getData(watcher, ['distributions', this.getDistributionID(), 'metaData', 'name']);
      case Constants.READER_DOC_TYPE.WRITER:
      case Constants.READER_DOC_TYPE.PREVIEW:
        const manuscriptID = ManuscriptInfo.getDraftManuscriptID(watcher, Constants.extractContentID(this.getBookID()) as any);
        if (manuscriptID) {
          const info = ManuscriptInfo.getManuscriptInfo(watcher, manuscriptID);
          if (info) {
            return info.ownerName;
          }
        }
        break;
    }
    return '';
  }
}


let g_MetricInContext = false;
function checkInContext() {
  if (!g_MetricInContext) {
    Log.warn(
      '@mike',
      'metrics.readerRecordedOutsideContext',
      'reader.reader metric recorded outside of a reader context. Please call context.recordMetric',
    );
  }
  return g_MetricInContext;
}


Metrics.registerMetricGroup({
  READER: {
    READER: {
      shouldRecord: checkInContext,
    },
  },
});

