/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as ClientPerf from 'clientjs/clientPerf';
import { PerfTimer } from 'clientjs/clientPerf';
import { BottomBar } from 'clientjs/components/CanvasReader/BottomBar.tsx';
import * as CanvasConstants from 'clientjs/components/CanvasReader/CanvasConstants';
import { PlusButtonArray } from 'clientjs/components/CanvasReader/PlusButtonArray';
import { ReactionBar } from 'clientjs/components/CanvasReader/ReactionBar';
import { ReaderContext } from 'clientjs/components/CanvasReader/ReaderContext';
import { LAYOUT_CONSTANTS, FONT_TABLE } from 'clientjs/components/CanvasReader/ReaderStyle';
import { FPSGraph } from 'clientjs/components/FPSGraph.tsx';
import * as GlobalModal from 'clientjs/components/GlobalModal.tsx';
import { ReaderLocations } from 'clientjs/components/Reader/Locations/ReaderLocations.tsx';
import { ReaderPageNumOverlay } from 'clientjs/components/Reader/Locations/ReaderPageNumOverlay.tsx';
import { ReaderQuietModeModal } from 'clientjs/components/Reader/Locations/ReaderQuietModeModal';
import { ReaderCanvasContent } from 'clientjs/components/Reader/ReaderCanvasContent.tsx';
import { ReaderMenuBar } from 'clientjs/components/Reader/ReaderMenuBar.tsx';
import { ReaderNote } from 'clientjs/components/Reader/ReaderNote.tsx';
import { GroupColor } from 'clientjs/components/ReaderApp/GroupColor.tsx';
import { ReaderReactionBreakdown } from 'clientjs/components/ReaderApp/ReaderReactionBreakdown.tsx';
import { ReaderLoadingIndicator } from 'clientjs/components/ReaderUI/ReaderLoadingIndicator.tsx';
import * as ReaderModal from 'clientjs/components/ReaderUI/ReaderModal.tsx';
import * as GroupUtils from 'clientjs/groupUtils';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as ReaderUtil from 'clientjs/readerUtil';
import * as Constants from 'clientjs/shared/constants';
import * as ReaderParse from 'clientjs/shared/readerParse';
import * as SkuUtils from 'clientjs/skuUtils';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { FontManager } from 'overlib/client/components/Layout/Font';
import * as LayoutDrawable from 'overlib/client/components/Layout/LayoutDrawable';
import * as IpcUtil from 'overlib/client/ipcClientUtil';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as DataStore from 'overlib/shared/dataStore';
import { NO_DIMS } from 'overlib/shared/logCommon';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const IDLE_TIMEOUT = 30000; // 30s

const LOADING_TIMEOUT = 10000; // 10s to load

const LAYERS_MASK = Util.objectMakeImmutable({
  _ids: {
    name: 1,
  },
});

class IdleTimer {
  private on = false;

  constructor(
    readonly watcher: DataWatcher,
    readonly name: string,
    readonly onFn: () => void,
    readonly offFn: () => void,
    readonly delay: number, // milliseconds
  ) {
    this.ping();
  }

  private elapsed = () => {
    this.on = false;
    this.offFn();
  }

  ping() {
    if (!this.on) {
      this.onFn();
    }
    this.on = true;
    this.watcher.setNamedTimeout(this.name, this.elapsed, this.delay);
  }
}

interface ReaderProps {
  bookID: Constants.BookID;
  reactionGroupID?: Constants.ReactionGroupID;
  location?: string;
  hideUI?: boolean;
}

interface ReaderState {
  loaded: boolean;
// ReaderWrapper loads the book data, creates and provides the readercontext, and thus gates the whole loading process
  showGroupColor: boolean;
}

export class ReaderWrapper extends DataWatcher<ReaderProps, ReaderState> {
  readerContext: ReaderContext | undefined;
  font: FontManager;
  fontReady: boolean = false;
  parsedData: ReaderParse.ParsedData;

  static childContextTypes = {
    readerContext: PropTypes.object,
  };

  state = {
    loaded: false,
    showGroupColor: false,
  };

  getChildContext = () => {
    return {readerContext: this.readerContext};
  }

  private finishLoading = () => {
    this.clearNamedTimeout('loadingTimeout');
    this.setState({ loaded: true });
  }

  private loadingTimeout = () => {
    Log.error('@sam', 'Hit loading timeout', {
      props: this.props,
    });
    Navigation.go(ReaderRoutes.discover);
  }

  private getReactionGroupID = () => {
    if (Constants.isMobileWriterBookID(this.props.bookID)) {
      return this.props.bookID as string as Constants.ReactionGroupID;
    }
    const [distributionID, itemID] = Constants.splitBookID(this.props.bookID);
    return this.props.reactionGroupID || GroupUtils.getBestReactionGroupID(this, distributionID, itemID);
  }

  private createContextIfReady = (perf: PerfTimer) => {
    if (!this.componentIsMounted()) {
      return;
    }

    const groupID = this.getReactionGroupID();
    if (!groupID) {
      Log.error('@sam', 'Unable to find reaction group for bookID', this.props.bookID);
      Navigation.go(ReaderRoutes._404);
      return;
    }

    if (!GroupUtils.isValidReactionGroup(null, groupID)) {
      Log.error('@sam', 'Unable to access reaction group ' + groupID);
      Navigation.go(ReaderRoutes._404);
      return;
    }

    if (this.font && this.fontReady && this.parsedData) {
      this.readerContext = new ReaderContext(this.props.bookID, groupID, this.parsedData);
      this.finishLoading();
      ClientPerf.stop(perf);
    }
  }

  private processBookData = (
    bookData: any,
    _bookLayers: StashOf<number>,
    perf: PerfTimer,
    activeLayers: StashOf<string>,
  ) => {
    // Something might break during parse, so start a loading timeout here.
    // Don't want to to do it earlier because you might be downloading a book or something slow.
    this.setNamedTimeout('loadingTimeout', this.loadingTimeout, LOADING_TIMEOUT, true);

    const parsePerf = ClientPerf.start('Reader', 'parse');
    const parsedData = ReaderParse.parse(NO_DIMS, bookData, activeLayers);
    ClientPerf.stop(parsePerf);
    if (typeof parsedData === 'string') {
      // Got error message instead of parsed data. Should only happen if previewing draft
      Log.warn('@sam', 'error.previewing.book', parsedData);
      GlobalModal.openModal('okCancel', {
        title: 'Ampersand Reader',
        description: 'We encountered an error in the text of this manuscript:\n' + parsedData,
        ok: 'Ok',
      });
      this.clearNamedTimeout('loadingTimeout');
    } else {
      this.parsedData = parsedData;
      ReaderUtil.preloadImages(parsedData);
      this.createContextIfReady(perf);
    }
  }



  private loadBookData = (bookID: Constants.BookID, perf: PerfTimer, activeLayers) => {
    //const fontSizeStr = DataStore.getData(null, ['vrsettings', 'fontSize']);
    //const fontSize = ReaderStyle.FONT_SIZES[fontSizeStr];
    this.font = LayoutDrawable.setFontTable(FONT_TABLE, this.safeCb((_font) => {
      this.fontReady = true;
      this.createContextIfReady(perf);
    }));

    const [distributionID, itemID] = Constants.splitBookID(this.props.bookID);

    const fetchBook = () => {
      const isPreview = this.getData(['library', distributionID, 'content', itemID, 'preview'], 1, true);
      ReaderUtil.bookFetch(distributionID, itemID, isPreview, this.safeCb((err, data) => {
        if (bookID !== this.props.bookID) {
          // must have reloaded
          return;
        }
        if (err) {
          let header = 'Content not available';
          let text = 'Please try again, or contact customer service for assistance.';
          if (err === 'offline') {
            header = 'Could not fetch content';
            text = 'Please make sure your device is online and try again.';
          } else if (Util.isNotFound(err)) {
            header = 'Content not found';
          }
          ReaderModal.openReaderModal({
            showOK: true,
            header,
            text,
            onOK: () => {
              Navigation.goBack();
            },
          });
        } else {
          const layers: StashOf<number> = DataStore.getData(null, ['distributions', distributionID, 'items', itemID, 'layers'], LAYERS_MASK, {});
          this.processBookData(data, layers, perf, activeLayers);
        }
      }));
    };

    const isPseudoChannel = Constants.isPseudoChannelBookID(this.props.bookID);
    const isPrivateShare = Constants.isPrivateShareBookID(this.props.bookID);
    const hasBook = Boolean(this.getData(['library', distributionID, 'content', itemID], 1));
    if (hasBook || isPseudoChannel || isPrivateShare) {
      fetchBook();
    } else {
      // You probably followed a notification or other URL here, but you do not yet own this book or its preview.
      // Try to acquire it.
      const skuID = SkuUtils.findSkuFromContent(null, distributionID, itemID);
      if (!skuID) {
        // SOL
        ReaderModal.openReaderModal({
          showOK: true,
          header: 'Content not found.',
          text: 'Unable to find this content.',
          onOK: () => {
            Navigation.goBack();
          },
        });
        return;
      } else {
        const groupID = this.getReactionGroupID();
        if (SkuUtils.isPurchaseInFlight()) {
          // try loading book data again in a little bit... still purchasing something
          this.setTimeout(() => {
            this.loadBookData(bookID, perf, activeLayers);
          }, 2000);
          return;
        }
        SkuUtils.purchaseSku(distributionID, skuID, groupID, true, null, this.safeCb((err, result) => {
          if (!err && result) {
            fetchBook();
          } else {
            Log.warn('@sam', 'reader.error.purchasing.book', err);
            ReaderModal.openReaderModal({
              showOK: true,
              header: 'Content not found.',
              text: 'Please make sure your device is online and try again.',
              onOK: () => {
                Navigation.goBack();
              },
            });
          }
        }));
      }
    }
  }

  idleTimer: IdleTimer | undefined;

  componentWillMount() {
    super.componentWillMount();

    IpcUtil.sendMessage('setIdleTimer', {enabled: false});
    IpcUtil.sendMessage('keyboardHideBar', {hideBar: true});

    const perf = ClientPerf.start('Reader', 'load');
    const activeLayers: StashOf<string> = this.getData(['localSettings', 'layerTesting', 'activeLayers']);

    // delay load start to allow the slide-in animation to complete
    // TODO only do this if sliding in, not on cold start at the URL
    this.setTimeout(() => {
      this.loadBookData(this.props.bookID, perf, activeLayers);
    }, 250);

    this.idleTimer = new IdleTimer(this, 'ReaderWrapper_IdleTimer',
      () => IpcUtil.sendMessage('setIdleTimer', {enabled: true}),
      () => IpcUtil.sendMessage('setIdleTimer', {enabled: false}),
      IDLE_TIMEOUT,
    );
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    if (this.readerContext) {
      this.readerContext.destructor();
      this.readerContext = undefined;
    }
    IpcUtil.sendMessage('setIdleTimer', {enabled: true});
    IpcUtil.sendMessage('keyboardHideBar', {hideBar: false});
  }

  componentWillReceiveProps(newProps) {
    if (newProps.bookID !== this.props.bookID) {
      Log.error('@sam', 'Can\'t handle new bookID at this level, set key based on bookID');
    }
  }

  private tocContainerMounted = () => {
    if (!this.readerContext) {
      return;
    }

    const tocElem = document.getElementById(CanvasConstants.TOC_CONTAINER_ID);
    tocElem && (tocElem.style.webkitTransform = 'translate(100%)');

    // see if members changed and we need the group color screen again
    const displayTime = this.readerContext.getReactionGroupMemberListDisplayTime(this);
    const modTime = this.readerContext.getReactionGroupMemberListModTime(this);
    if (displayTime <= modTime && !Constants.isWriterPreviewBookID(this.props.bookID)) {
      // Count members
      const memberIDs = this.readerContext.getReactionGroupMemberIDs(null);
      if (!memberIDs) {
        Log.error('@sam', 'Somehow unable to find reaction group while mounting reader page', {props: this.props});
      } else {
        const memberCount = Object.keys(memberIDs).length;
        if (memberCount > 1) {
          this.setState({ showGroupColor: true });
          this.readerContext.setReactionGroupMemberListDisplayTime();
        }
      }
    }
  }

  close = () => {
    this.setState({showGroupColor: false});
  }

  onTouch = () => {
    this.idleTimer && this.idleTimer.ping();
  }

  render() {
    const navHeight = LAYOUT_CONSTANTS.TOP_BAR_TOC_HEIGHT;
    // Temp until we figure out what initial layout loading is like in new reader
    const readerStyle = {
      fill: '#181818',
      color: '#fff',
      backgroundColor: '#181818',
      transition: 'color 0.25s ease, background-color 0.25s ease, fill 0.25s ease',
      'borderColor': 'rgba(102, 102, 102, 1)',
    };

    if (!this.state.loaded || !this.readerContext) {
      return <ReaderLoadingIndicator/>;
    }

    const reactionBreakdownHeight = this.readerContext.getUIState(this, ['page', 'height']) || this.getData(['App', 'height']);
    const showReactionBreakdown = this.readerContext.getUIState(this, ['showReactionBreakdown']);
    const transReactionBreakdown = showReactionBreakdown ? '0' : `${reactionBreakdownHeight}`;
    const noteActive = this.readerContext.getUIState(this, ['activeBar']) === 'note';
    let editKey = 'new';
    if (noteActive) {
      const commentID = this.readerContext.getUIState(this, ['editCommentID']);
      if (commentID) {
        editKey = commentID;
      }
    }
    let bottomBar: JSX.Element | JSX.Element[] | null = null;

    if (null === this.readerContext.getUIState(this, ['lightboxImagesEntryIndex'])) {
      if (this.readerContext.isWorkshop(this)) {
        bottomBar = [
          <BottomBar key='botbar' />,
        ];
      } else {
        bottomBar = [];
      }

      bottomBar.push(<PlusButtonArray key='plus' noShare={this.props.hideUI} />);
    }

    const showPerfGraph = !this.props.hideUI && this.getData(['vrsettings', 'showPerfGraph']);

    return (
      <Flex.Row classes='fg-1 pos-r us-n' style={readerStyle} onTouchStartCapture={this.onTouch} onTouchMoveCapture={this.onTouch}>
        <ReaderCanvasContent
          key={'rc-' + this.props.bookID}
          testid={'ReaderContent-' + this.props.bookID}
        />
        {!showPerfGraph ? null : (
          <div classes='pos-a top-70 left-10 ptrevt-n' key='fpsGraphContainer'>
            <FPSGraph forceShow classes='h-50' />
          </div>
        )}
        {this.props.hideUI ? null : <ReaderMenuBar bookID={this.props.bookID} key='menuBar'/>}
        <ReaderPageNumOverlay key='pageNumOverlay'/>
        <ReactionBar/>
        {bottomBar}
        {noteActive ? <ReaderNote key={editKey}/> : null}
        <div
          id={CanvasConstants.TOC_CONTAINER_ID}
          ref={this.tocContainerMounted}
          classes={'pos-a bot-0 left-0 right-0 top-' + (navHeight + 1).toString()}
        >
          <div classes={'pos-a top-0 bot-0 left-0 right-' + (LAYOUT_CONSTANTS.MIN_SCALE_FACTOR * 100) + '%'}>
            {this.props.hideUI ? null : <ReaderLocations location={this.props.location}/>}
          </div>
        </div>
        { this.state.showGroupColor ?
          <Flex.Col classes='pos-a c-white-bg fullSize'>
            <GroupColor close={this.close} />
          </Flex.Col> :
          null }
        { showReactionBreakdown ?
          <Flex.Col classes='pos-a fullSize c-gandalf-bg-a0.5'
          onClick={() => this.readerContext!.replaceUIState(['showReactionBreakdown'], false)}/> :
          null }
        <Flex.Col classes={`pos-a trans-tr-0.4s bot-0 left-0 right-0 top-${reactionBreakdownHeight * .2} ty-${transReactionBreakdown}`}>
          <ReaderReactionBreakdown/>
        </Flex.Col>
        {this.props.hideUI ? null : <ReaderQuietModeModal/>}
      </Flex.Row>
    );
  }
}
