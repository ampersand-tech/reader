/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import * as CanvasConstants from 'clientjs/components/CanvasReader/CanvasConstants';
import { CANVAS_TOUCH_EVENTS } from 'clientjs/components/CanvasReader/CanvasConstants';
import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import * as PageCountUtils from 'clientjs/components/CanvasReader/PageCountUtils';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { ReaderLocationsBar } from 'clientjs/components/Reader/Locations/ReaderLocationsBar.tsx';
import { ReaderGroupMenu } from 'clientjs/components/Reader/ReaderGroupMenu';
import { ReaderSettings } from 'clientjs/components/Reader/ReaderSettings.tsx';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex';
import { ScrollEventData } from 'overlib/client/components/Layout/MomentumScroller';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as DataStore from 'overlib/shared/dataStore';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const BOUNCE_BACK_THRESHOLD = 5;

interface ReaderMenuContext {
  bookID: string;
  bookTitle: string;
  goBack: () => void;
  showBack: boolean;
  goToNotifications: () => void;
  hasAdminMenu: boolean;
  hasLayer: boolean;
  inLayer: boolean;
  numPages: number;
  pagesToNextChapter: number;
  currentPage: number;
  showAllLocations: () => void;
  showNewComments: () => void;
  showSettings: boolean;
  showGroupMenu: boolean;
  showToc: boolean;
  toggleLayers: () => void;
  toggleSettings: () => void;
  toggleGroupMenu: () => void;
  toggleToc: () => void;
  isBeeped: boolean;
  viewNewComments: boolean;
  toggleQuietMode: () => void;
  quietMode: boolean;
}

const THREADS_MASK = Util.objectMakeImmutable({
  _ids: {
    sentences: {
      _ids: {
        modTime: 1,
        lastRead: 1,
      },
    },
  },
});

interface ReaderMenuProps {
  bookID: string;
}

interface ReaderMenuState {
  navTop: number;
  topDelay: number;
  lastSelectedIdx: string;
}

export class ReaderMenuBar extends DataWatcher<ReaderMenuProps, ReaderMenuState> {
  context: ProviderContext;

  static contextSchema: StashOf<Types.Schema> = {
    bookID: Types.STRING,
    bookTitle: Types.STRING,
    goBack: Types.FUNCTION,
    showBack: Types.BOOL,
    goToNotifications: Types.FUNCTION,
    hasAdminMenu: Types.BOOL,
    hasLayer: Types.BOOL,
    inLayer: Types.BOOL,
    numPages: Types.INT,
    currentPage: Types.NUMBER,
    pagesToNextChapter: Types.NUMBER,
    showAllLocations: Types.FUNCTION,
    showNewComments: Types.FUNCTION,
    showSettings: Types.BOOL,
    showGroupMenu: Types.BOOL,
    showToc: Types.BOOL,
    toggleLayers: Types.FUNCTION,
    toggleSettings: Types.FUNCTION,
    toggleGroupMenu: Types.FUNCTION,
    toggleToc: Types.FUNCTION,
    isBeeped: Types.BOOL,
    viewNewComments: Types.BOOL,
    toggleQuietMode: Types.FUNCTION,
    quietMode: Types.BOOL,
  };


  static propTypes = {
    bookID: PropTypes.string.isRequired,
  };

  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  state = {
    navTop: 0,
    topDelay: 0,
    lastSelectedIdx: '',
  };

  private goToNotifications = () => {
    Navigation.go(ReaderRoutes.notifications);
  }

  onScrollChange = (scrollData: ScrollEventData) => {
    if (this.context.readerContext.getUIState(null, ['showToc'])) {
      if (this.state.navTop !== 0 || this.state.topDelay !== 0) {
        this.setState({navTop: 0, topDelay: 0});
        this.context.readerContext.setSettings(false);
        this.context.readerContext.closeGroupMenu();
      }
      return;
    }
    let deltaY = scrollData.deltaY;
    const curY = scrollData.scrollY;

    if (deltaY > 0) {
      this.context.readerContext.setSettings(false);
      this.context.readerContext.closeGroupMenu();
    }

    const beginning = this.context.readerContext.getBookEdgeBeginning ? this.context.readerContext.getBookEdgeBeginning() : null;
    const navHeight = LAYOUT_CONSTANTS.TOP_BAR_HEIGHT;
    const topDelayAmount = navHeight * 1;
    let topDelay = this.state.topDelay;

    if (beginning !== null && beginning > curY - navHeight) {
      topDelay = -topDelayAmount;
    } else if (deltaY > 0) {
      topDelay += deltaY;
      if (topDelay > 0) {
        topDelay = 0;
      }
    } else if (this.state.navTop <= -navHeight) {
      topDelay += deltaY;
      if (topDelay < -topDelayAmount) {
        topDelay = -topDelayAmount;
      }
      deltaY += (topDelayAmount + topDelay);
    }

    let newTop = this.state.navTop - deltaY;
    if (!this.context.readerContext.getBookEdgeBeginning) {
      Log.error('@palmer', 'no book beginning edge');
      return;
    }

    if (beginning !== null) {
      // if beginning is null, we haven't gotten there yet.
      // If we are there, don't let the bounce scroll at the top push the bar back up
      if (curY < BOUNCE_BACK_THRESHOLD + beginning && deltaY > 0) {
        newTop = this.state.navTop;
      }
    }


    if (newTop < -navHeight) {
      newTop = -navHeight;
    } else if (newTop > 0) {
      newTop = 0;
    }
    if (this.state.navTop !== newTop || this.state.topDelay !== topDelay) {
      this.setState({navTop: newTop, topDelay: topDelay});
    }
  }

  componentDidMount() {
    this.context.readerContext.registerEventCallback(CANVAS_TOUCH_EVENTS.SCROLL_CHANGE, this.onScrollChange);
    this.context.readerContext.recordMetric('nav.bookLoaded');
    Sketch.runAction('vrsettings.setActiveBookID', this.props.bookID);
  }

  componentWillUpdate(_nextProps, nextState) {
    const selectedEntryIdx = this.context.readerContext.getUIState(this, ['selection', 'entryIdx']);

    if (nextState.lastSelectedIdx !== selectedEntryIdx) {
      nextState.lastSelectedIdx = selectedEntryIdx;
      if (selectedEntryIdx) {
        nextState.navTop = -LAYOUT_CONSTANTS.TOP_BAR_HEIGHT;
        this.context.readerContext.setSettings(false);
      }
    }
    const scaleFactor = this.context.readerContext.getUIState(this, ['scaleFactor']);
    if (scaleFactor === LAYOUT_CONSTANTS.MIN_SCALE_FACTOR) {
      nextState.navTop = 0;
    }
  }

  componentWillMount() {
    super.componentWillMount();
    const selectedEntryIdx = this.context.readerContext.getUIState(this, ['selection', 'entryIdx']);
    this.setState({lastSelectedIdx: selectedEntryIdx});
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.context.readerContext.unregisterEventCallback(CANVAS_TOUCH_EVENTS.SCROLL_CHANGE, this.onScrollChange);
  }

  getWordsUpToCharCount = (str: string, limit: number) => {
    if (!str) {
      return '';
    }
    const words = str.split(' ');
    let total = 0;
    for (let i = 0; i < words.length; i++) {
      if (total + words[i].length + i < limit) {
        total += words[i].length;
      } else {
        return words.slice(0, i).join(' ') + '...';
      }
    }
    return str;
  }

  toggleToc = () => {
    if (!this.context.readerContext.getUIState(null, ['showToc'])) {
      this.setState({navTop: 0});
    }
    this.context.readerContext.toggleToc();
  }

  private toggleSettings = () => {
    this.context.readerContext.toggleSettings();
  }

  private toggleGroupMenu = () => {
    this.context.readerContext.toggleGroupMenu();
  }

  showNewComments = () => {
    this.context.readerContext.replaceUIState(['viewNewComments'], true);
  }

  showAllLocations = () => {
    this.context.readerContext.replaceUIState(['viewNewComments'], false);
  }

  render() {
    this.context.readerContext.getUIState(this, ['selection', 'entryIdx']); //used in willUpdate call
    this.context.readerContext.getUIState(this, ['scaleFactor']);  // used in willUpdate call
    const showToc = this.context.readerContext.getUIState(this, ['showToc']);
    const viewNewComments = this.context.readerContext.getUIState(this, ['viewNewComments']);
    let bookTitle = this.context.readerContext.getContentItemData(this, ['title']);
    bookTitle = this.getWordsUpToCharCount(bookTitle, 50);
    const showSettings = this.context.readerContext.getUIState(this, ['showSettings']);
    const showGroupMenu = this.context.readerContext.getUIState(this, ['showGroupMenu']);
    const appWidth = this.getData(['App', 'width']);
    const imagesEntryIdx = this.context.readerContext.getUIState(this, ['lightboxImagesEntryIndex'], 1) as number | null;
    const navTop = imagesEntryIdx !== null ? -LAYOUT_CONSTANTS.TOP_BAR_HEIGHT : this.state.navTop;
    const quietMode = this.context.readerContext.getUIState(this, ['quietMode']);

    const hasAdminMenu = this.getData(['App', 'isAdmin']) && this.getData(['localSettings', 'readerAdminMenu']);

    let layerCount = 0; //Object.keys(this.context.readerContext.getParsedData(['layers'], Util.IDS_MASK)).length;
    let id;

    // WTF: this is a bool
    let layerColor = this.context.readerContext.getUIState(this, ['showLayers']);
    if (!layerColor) {
      let activeLayerIDs = DataStore.getData(null, ['localSettings', 'layerTesting', 'activeLayers'], Util.IDS_MASK);
      for (id in activeLayerIDs) {
        layerColor = id;
        break;
      }
    }

    // watch the current position, so that rerender happens during a change and the pages to next chapter is updated
    this.getData(['vrdata', this.props.bookID, 'positions', 'current']);

    const currentPage = this.context.readerContext.getCurrentPage(this);

    const threads = this.context.readerContext.getReactionGroupData(this, ['threads'], THREADS_MASK);
    const lastOpened = this.context.readerContext.getReactionGroupData(this, ['lastViewedToc'], 1);

    let beeped = false;
    for (const t in threads) {
      for (const s in threads[t].sentences) {
        const sentence = threads[t].sentences[s];
        if (sentence.modTime > sentence.lastRead && sentence.modTime > lastOpened) {
          beeped = true;
          break;
        }
      }
    }

    const pageCount = this.context.readerContext.getContentItemData(this, ['pageCount']) || 0;

    const context: ReaderMenuContext = {
      bookID: this.props.bookID,
      bookTitle: bookTitle,
      goBack: () => Navigation.goBack(),
      showBack: this.context.readerContext.getReaderDocType() !== Constants.READER_DOC_TYPE.PREVIEW,
      goToNotifications: this.goToNotifications,
      hasAdminMenu: hasAdminMenu,
      hasLayer: Boolean(layerCount),
      inLayer: Boolean(layerColor),
      numPages: Math.max(PageCountUtils.getTotalNumberOfPages(this, this.context.readerContext), pageCount),  // for previews
      pagesToNextChapter: 0,
      currentPage: currentPage,
      showSettings: showSettings,
      showGroupMenu: showGroupMenu,
      showToc: showToc,
      showAllLocations: this.showAllLocations,
      showNewComments: this.showNewComments,
      toggleSettings: this.toggleSettings,
      toggleGroupMenu: this.toggleGroupMenu,
      toggleToc: this.toggleToc,
      toggleLayers: this.context.readerContext.toggleLayers,
      isBeeped: beeped,
      viewNewComments: viewNewComments,
      toggleQuietMode: this.context.readerContext.toggleQuietMode,
      quietMode: quietMode,
    };

    return (
      <div
        id={CanvasConstants.TOC_MENU_BAR_ID}
        classes={`pos-a left-0 right-0 top-0`}
        key='locationsWrapper'
      >
        <Flex.Col reverseStacked classes={`ptrevt-n w-100% top-${navTop} pos-a`}>
          <FixedTemplate template='ReaderMenuBar' context={context} />
          <div classes='pos-r'>
            <div classes='pos-a left-0 top-0 w-100%'><ReaderSettings /></div>
            <div classes='pos-a left-0 top-0 w-100%'><ReaderGroupMenu /></div>
          </div>
        </Flex.Col>
        <Flex.Col classes={`w-100% fg-1 pos-a left-${appWidth} `}>
          <ReaderLocationsBar bookID={this.props.bookID}/>
        </Flex.Col>
      </div>
    );
  }
}

registerContextSchema(module, 'ReaderMenuBar', ReaderMenuBar.contextSchema);
