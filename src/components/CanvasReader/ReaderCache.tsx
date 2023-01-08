/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import * as ColorConstants from 'clientjs/colorConstants';
import { BookCoverReader } from 'clientjs/components/CanvasReader/BookCover.tsx';
import { CANVAS_TOUCH_EVENTS, FullContentPosition, ScrollToParams } from 'clientjs/components/CanvasReader/CanvasConstants';
import { CommentSummary } from 'clientjs/components/CanvasReader/CommentSummary';
import { ContentParagraph } from 'clientjs/components/CanvasReader/ContentParagraph';
import { ContextProvider } from 'clientjs/components/CanvasReader/ContextProvider';
import { ImageSet } from 'clientjs/components/CanvasReader/ImageSet.tsx';
import { Layer } from 'clientjs/components/CanvasReader/Layer';
import { LayoutTrackerLine, LayoutTracker, LayoutTrackerSentence, LayoutTrackerComment } from 'clientjs/components/CanvasReader/LayoutTracker';
import * as Nav from 'clientjs/components/CanvasReader/Nav';
import { ReaderContext } from 'clientjs/components/CanvasReader/ReaderContext';
import { ReaderPreviewInsert } from 'clientjs/components/CanvasReader/ReaderPreviewInsert';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { ReaderTerminator } from 'clientjs/components/CanvasReader/ReaderTerminator';
import { ReaderUX } from 'clientjs/components/CanvasReader/ReaderUX.tsx';
import * as Constants from 'clientjs/shared/constants';
import { Types } from 'clientjs/shared/paragraphTypes';
import * as ReaderParse from 'clientjs/shared/readerParse';
import { EntryTypes, ParagraphEntry } from 'clientjs/shared/readerParse';
import * as Util from 'overlib/client/clientUtil';
import * as CanvasRenderer from 'overlib/client/components/Layout/CanvasRenderer';
import { LayoutNode } from 'overlib/client/components/Layout/LayoutNode';
import { renderToLayout } from 'overlib/client/components/Layout/LayoutRenderer';
import { LayoutNodeData, LayoutParent } from 'overlib/client/components/Layout/LayoutTypes';
import { MomentumScroller, ScrollEvent, ScrollEventData } from 'overlib/client/components/Layout/MomentumScroller';
import { SwipeHandler } from 'overlib/client/components/Layout/SwipeHandler';
import { TouchAndScrollHandlers } from 'overlib/client/components/Layout/TouchDispatcher';
import * as Log from 'overlib/client/log';
import * as MathUtils from 'overlib/shared/mathUtils';
import { Dimensions, Point } from 'overlib/shared/mathUtils';
import * as React from 'react';

const BACK_BUFFER_PAGES = 1;
const FORWARD_BUFFER_PAGES = 2;

const SCROLL_ANIMATION_TIME = 300;


function cmpLayoutY(y: number, layout: LayoutNodeData) {
  if (y < layout.computedOffset.y) { return -1; }
  if (y > (layout.computedOffset.y + layout.renderDims.height)) { return 1; }
  return 0;
}

export class ReaderCache implements LayoutParent {
  private context: ReaderContext;
  private nav: Nav.Nav;

  private scrollHandler: MomentumScroller;
  private swipeHandler: SwipeHandler;

  private children: LayoutNodeData[] = [];
  private overlayParent: LayoutNode;
  private uxLayout: LayoutNode;
  private uxOverlayParent: LayoutNode | null;
  private layoutsDirty: boolean = false;

  private visibleLayoutStart: number;
  private visibleLayoutEnd: number;
  private width: number = 0;
  private height: number = 0;

  private bookEdgeBeginning: number|null;
  private bookEdgeEnd: number|null;

  private lastScrollY: number = 0;

  private anchorEntryIdx: number;
  private anchorOffset: number = 0;

  constructor(
    context: ReaderContext,
    nav: Nav.Nav,
    readonly getCanvas: () => HTMLCanvasElement | undefined,
    readonly getParentScreenOffset: () => Point,
  ) {
    this.context = context;
    this.nav = nav;

    this.scrollHandler = new MomentumScroller({
      getScrollBounds: this.getScrollBounds,
      getContainerSize: this.getSize,
      getScaleFactor: this.getScaleFactor,
      fireEvent: this.onScrollEvent,
      scrollY: true,
    });

    this.swipeHandler = new SwipeHandler(
      this.getScaleFactor,
      this.context.setScaleFactor,
      LAYOUT_CONSTANTS.MIN_SCALE_FACTOR,
      LAYOUT_CONSTANTS.SCALE_FACTOR_VELOCITY,
    );

    this.context.getContentPosition = this.getContentPosition;
    this.context.setTargetScaleFactor = this.setTargetScaleFactor;
    this.context.getBookEdgeBeginning = this.getBookEdgeBeginning;
    this.context.autoSelectSentence = this.selectSentenceClosestToMiddle;
    this.context.getSentenceClosestToMiddle = this.getSentenceClosestToMiddle;
    this.context.navTo = this.navTo;
    this.context.getOverlayParent = this.getOverlayParent;
    this.context.getUXOverlayParent = () => { return this.uxOverlayParent; };

    this.visibleLayoutStart = 0;
    this.visibleLayoutEnd = 0;
    this.bookEdgeBeginning = null;
    this.bookEdgeEnd = null;

    this.overlayParent = renderToLayout(undefined, <div/>, this);

    this.uxLayout = renderToLayout(undefined, (
      <ContextProvider context={context}>
        <ReaderUX overlayRef={(node) => {this.uxOverlayParent = (node as any); }}/>
      </ContextProvider>
    ), {
      // need to give the UXLayout its own LayoutParent interface, because
      // the screen offset should not include the anchor offset
      childIsDirty: () => { this.childIsDirty(); },
      getScreenOffset: () => { return this.getParentScreenOffset(); },
      layoutIfNeeded: () => { return this.layoutIfNeeded(); },
      getCanvas: () => { return this.getCanvas(); },
    });
  }

  public destructor = () => {
    for (const child of this.children) {
      child.node.destructor();
    }
    this.children = [];

    this.overlayParent.destructor();
    this.uxLayout.destructor();
    this.scrollHandler.destructor();
    this.swipeHandler.destructor();
  }

  // LayoutParent interface methods:
  public childIsDirty() {
    this.setDirty();
  }

  public getScreenOffset(): Point {
    const offset = this.getParentScreenOffset();
    offset.y -= this.anchorOffset;
    return offset;
  }

  private convertLayoutToScrollY(layoutY: number) {
    return layoutY + this.lastScrollY - this.anchorOffset;
  }

  private convertScrollToLayoutY(scrollY: number) {
    return scrollY - this.lastScrollY + this.anchorOffset;
  }

  private convertCanvasToLayoutSpace(canvasSpacePoint: Point): Point {
    const scaleFactor = this.getScaleFactor();
    return {
      x: canvasSpacePoint.x / scaleFactor,
      y: this.convertScrollToLayoutY(this.getScrollTop() + (canvasSpacePoint.y / scaleFactor)),
    };
  }

  private getScrollBounds = () => {
    return {
      xMin: null,
      xMax: null,
      yMin: this.getBookEdgeBeginning(),
      yMax: this.getBookEdgeEnd(),
    };
  }

  private getSize = (): Dimensions => {
    return {
      width: this.context.getUIState(null, ['page', 'width']) as number,
      height: this.context.getUIState(null, ['page', 'height']) as number,
    };
  }

  private getHeight = () => {
    return this.context.getUIState(null, ['page', 'height']) as number;
  }

  private getScaleFactor = () => {
    return this.context.getUIState(null, ['scaleFactor']) as number;
  }

  private getScalingOffset() {
    const scale = this.getScaleFactor();
    const height = this.getHeight();
    return (height / scale - height) / 2;
  }

  private getScrollTop = () => {
    return this.scrollHandler.getScrollY() - this.getScalingOffset();
  }

  private onScrollEvent = (eventName: ScrollEvent, data: ScrollEventData) => {
    switch (eventName) {
      case 'scrollStart':
        this.context.onScrollStart(data.metric === 'nav.scrollToSelection');
        break;

      case 'scroll':
        this.context.callCallbacksForEvent(CANVAS_TOUCH_EVENTS.SCROLL_CHANGE, data);
        break;

      case 'scrollStop':
        this.nav.onScrollStop(data.metric);
        break;

      default:
        Util.absurd(eventName);
    }
  }

  private getOverlayParent = () => {
    return this.overlayParent;
  }

  private pointIsInWindow(layoutSpacePoint: Point) {
    const topBarHeight = LAYOUT_CONSTANTS.TOP_BAR_HEIGHT;
    const bottomBarHeight = this.context.getUIState(null, ['bottomBarHeight']);
    const pageHeight = this.getHeight();

    const windowTop = this.convertScrollToLayoutY(this.scrollHandler.getScrollY() + topBarHeight);
    const windowHeight = Math.max(pageHeight - topBarHeight - bottomBarHeight, 0);

    if (layoutSpacePoint.y >= windowTop && layoutSpacePoint.y <= windowTop + windowHeight) {
      return true;
    }
    return false;
  }

  private getLeafTouchableNodeAt(canvasSpacePoint: Point, layoutSpacePoint: Point) {
    let leafNode: LayoutNode|undefined = this.uxLayout.getLeafTouchableNodeAt(canvasSpacePoint);
    if (leafNode) {
      return leafNode;
    }

    leafNode = this.overlayParent.getLeafTouchableNodeAt(layoutSpacePoint);
    if (leafNode) {
      return leafNode;
    }

    for (let layoutIdx = this.visibleLayoutStart; layoutIdx <= this.visibleLayoutEnd; ++layoutIdx) {
      const layout = this.children[layoutIdx];
      const pos = layout.computedOffset;
      if (layoutSpacePoint.y >= pos.y && layoutSpacePoint.y <= (pos.y + layout.renderDims.height)) {
        const nodeSpacePoint: Point = {
          x: layoutSpacePoint.x - pos.x,
          y: layoutSpacePoint.y - pos.y,
        };
        return layout.node.getLeafTouchableNodeAt(nodeSpacePoint);
      }
    }

    return undefined;
  }

  public getTouchAndScrollHandlersAt = (canvasSpacePoint: Point): TouchAndScrollHandlers => {
    const ret: TouchAndScrollHandlers = {};

    const scaleFactor = this.getScaleFactor();
    const layoutSpacePoint = this.convertCanvasToLayoutSpace(canvasSpacePoint);

    const leafTouchableNode = this.getLeafTouchableNodeAt(canvasSpacePoint, layoutSpacePoint);
    if (!leafTouchableNode) {
      ret.scrollHandler = this.scrollHandler;
    }
    let nodeWalker = leafTouchableNode;
    while (nodeWalker) {
      ret.scrollHandler = ret.scrollHandler || nodeWalker.getScrollHandler();
      if (nodeWalker.dataProps.touchHandler && !ret.touchHandler) {
        ret.touchHandler = nodeWalker.dataProps.touchHandler;
      }
      if (nodeWalker.onClick && !ret.onClick) {
        ret.onClick = nodeWalker.onClick;
        ret.notifyActive = nodeWalker.notifyActive;
      }
      if (nodeWalker.onDoubleClick && !ret.onDoubleClick) {
        ret.onDoubleClick = nodeWalker.onDoubleClick;
      }
      if (nodeWalker.onLongPress && !ret.onLongPress) {
        ret.onLongPress = nodeWalker.onLongPress;
      }
      nodeWalker = nodeWalker.getParentNode();
    }

    if (scaleFactor < 0.5 || canvasSpacePoint.x > window.innerWidth * 0.8) {
      // allow swipe gesture if TOC is open or if the swipe starts in the right 20% of the screen
      ret.swipeHandler = this.swipeHandler;
    }

    if (this.context.getUIState(null, ['showToc'])) {
      if (this.pointIsInWindow(layoutSpacePoint)) {
        ret.onClick = () => {
          this.context.toggleToc();
        };
      } else {
        ret.onClick = () => {
          // scroll point to the top, but leave a little room for the nav bar
          const navHeight = LAYOUT_CONSTANTS.TOP_BAR_HEIGHT;
          const fontSize = this.context.getFontSize(null);
          const newScroll = this.convertLayoutToScrollY(layoutSpacePoint.y - (navHeight + fontSize + 10));
          this.scrollHandler.setTargetScrollY(newScroll, SCROLL_ANIMATION_TIME, 'easeInOutQuad', 'nav.tocReaderClick');
          this.context.toggleToc();
        };
      }
    }

    return ret;
  }

  private getBookEdgeBeginning = () => {
    return this.bookEdgeBeginning;
  }

  private getBookEdgeEnd = () => {
    return this.bookEdgeEnd;
  }

  public setCanvasSize = (width: number, height: number) => {
    if (width === this.width && height === this.height) {
      return;
    }

    this.width = width;
    this.height = height;

    const constraint = { min: {}, max: { width }};

    for (const child of this.children) {
      child.node.setExternalConstraints(constraint);
    }

    this.overlayParent.setExternalConstraints(constraint);

    this.uxLayout.setExternalConstraints({ min: {}, max: { width, height }});
    CanvasRenderer.kickRender();
  }

  private extendUp(targetY: number) {
    if (!this.children.length) {
      Log.error('@sam', 'Called extendUp without any children');
      return;
    }

    const parsedData = this.context.getRawParsedData();

    const firstChild = this.children[0];
    let minY = firstChild.computedOffset.y;
    let curIdx: number = firstChild.node.dataProps.entryIdx - 1;

    let firstLayerIdx: number = -1;
    let refLayerExtBorder = true;  // reference layer needs an unbroken blue line bridging paragraphs
    while (minY > targetY) {
      const entry = parsedData.entries[curIdx];
      if (!entry) {
        // hit the beginning?
        this.bookEdgeBeginning = this.convertLayoutToScrollY(this.children[0].computedOffset.y);
        break;
      }
      if (ReaderParse.isLayerFromEntry(entry)) {
        if (firstLayerIdx < 0) {
          firstLayerIdx = curIdx;
        }
        // Look ahead, figure out the range of layers and adjust curIdx to the end of the layers
        let counter = 100000; // just to make sure we don't infinite loop
        while (counter-- > 0) {
          const nextEntry = parsedData.entries[--curIdx];
          if (!nextEntry ||
              nextEntry.type === EntryTypes.commentSummary ||
              !ReaderParse.isLayerFromEntry(nextEntry)) {
            // hit the end, unroll last addition since we'll advance a few lines down
            ++curIdx;
            break;
          }
        }
      }
      let child;
      if (firstLayerIdx >= 0) {
        child = this.addChildren(curIdx, firstLayerIdx, true, false);
        firstLayerIdx = -1;
      } else {
        const prevEntry: ParagraphEntry = parsedData.entries[curIdx - 1] as ParagraphEntry;
        if (prevEntry && prevEntry.paraType !== Types.REFERENCE && (entry as ParagraphEntry).paraType === Types.REFERENCE) {
          refLayerExtBorder = false;
        } else {
          refLayerExtBorder = true;
        }
        child = this.addChildren(curIdx, -1, true, refLayerExtBorder);
      }
      curIdx--;
      if (child) {
        minY -= child.renderDims.height;
        child.computedOffset.y = minY;
      }
    }
  }

  private extendDown(targetY: number) {
    const parsedData = this.context.getRawParsedData();
    let maxY;
    let curIdx: number;
    if (this.children.length) {
      const lastChild = this.children[this.children.length - 1];
      maxY = lastChild.computedOffset.y + lastChild.renderDims.height;
      curIdx = lastChild.node.dataProps.lastEntryIdx + 1;
    } else {
      // no layouts, must be initing
      maxY = 0;
      curIdx = this.anchorEntryIdx;
    }
    let firstLayerIdx: number = -1;
    let refLayerExtBorder = false;  // reference layer needs an unbroken blue line bridging paragraphs
    while (maxY < targetY) {
      const entry = parsedData.entries[curIdx];
      if (!entry) {
        // hit the end?
        const lastChild = this.children[this.children.length - 1];
        this.bookEdgeEnd = this.convertLayoutToScrollY(lastChild.computedOffset.y + lastChild.renderDims.height);
        break;
      }
      if (ReaderParse.isLayerFromEntry(entry)) {
        if (firstLayerIdx < 0) {
          firstLayerIdx = curIdx;
        }
        // Look ahead!
        let counter = 100000; // just to make sure we don't infinite loop
        while (counter-- > 0) {
          const nextEntry = parsedData.entries[++curIdx];
          if (!nextEntry ||
              nextEntry.type === EntryTypes.commentSummary ||
              !ReaderParse.isLayerFromEntry(nextEntry)) {
            // hit the end, unroll last addition since we'll advance a few lines down
            --curIdx;
            break;
          }
        }
      }
      let child;
      if (firstLayerIdx >= 0) {
        child = this.addChildren(firstLayerIdx, curIdx, false, false);
        firstLayerIdx = -1;
      } else {
        const prevEntry: ParagraphEntry = parsedData.entries[curIdx - 1]  as ParagraphEntry;
        if (prevEntry && prevEntry.paraType === Types.REFERENCE && (entry as ParagraphEntry).paraType === Types.REFERENCE) {
          refLayerExtBorder = true;
        } else {
          refLayerExtBorder = false;
        }
        child = this.addChildren(curIdx, -1, false, refLayerExtBorder);
      }
      curIdx++;
      if (child) {
        child.computedOffset.y = maxY;
        maxY += child.renderDims.height;
      }
    }
  }

  private findLayoutIdxAtY(y: number): number {
    // First, are we above the top or below the bottom?
    if (y < this.children[0].computedOffset.y) {
      this.extendUp(y);
      return 0;
    } else {
      const lastChild = this.children[this.children.length - 1];
      if (y > (lastChild.computedOffset.y + lastChild.renderDims.height)) {
        this.extendDown(y);
        return this.children.length - 1;
      }
    }

    // Must be within layouts, so bsearch it
    const idx: number = Util.bsearch(this.children, cmpLayoutY.bind(undefined, y));
    if (idx < 0) {
      // bsearch failed
      Log.error('@sam', 'Binary search failed to find a layout', {y: y});
    }
    return idx;
  }

  private getContentPosition = (isContentWindow?: boolean): FullContentPosition | null => {
    const pageHeight = this.getHeight();
    let windowTop = 0;
    let windowBottom = pageHeight;
    if (isContentWindow) {
      windowTop = this.calcContentWindowTop();
      windowBottom = windowTop + this.calcContentWindowHeight();
    }

    let firstLineTracker: LayoutTrackerLine | undefined;
    let firstLineHeight: number = Infinity;
    let lastLineTracker: LayoutTrackerLine | undefined;
    let lastLineHeight: number = -Infinity;

    // find sentences on screen
    this.walkVisibleLayoutTrackers('line', (node: LayoutNode): Constants.TreeWalkerCBResult => {
      // iterate over all sentences under paragraphs touching the screen. not every sentence here is actually on screen
      const nodeLayout = node.getLayoutData();
      const top = node.getScreenOffset().y;
      const bottom = top + nodeLayout.renderDims.height;

      // Note that we want the bottom line to be completely on screen to count as 'seen'
      if (bottom > windowBottom) {
        return Constants.TREE_WALKER_CB_RESULT.DONT_DESCEND;
      }

      // Partial on screen counts for the top though, as you've already read it. Always err backwards to avoid skipping lines.
      if (bottom <= windowTop) {
        return Constants.TREE_WALKER_CB_RESULT.DONT_DESCEND;
      }
      // Got here? This sentence is on screen.
      if (top < firstLineHeight) {
        firstLineHeight = top;
        firstLineTracker = node.dataProps.layoutTracker;
      }
      if (top > lastLineHeight) {
        lastLineHeight = top;
        lastLineTracker = node.dataProps.layoutTracker;
      }
      return Constants.TREE_WALKER_CB_RESULT.DONT_DESCEND;
    });

    if (!firstLineTracker || !lastLineTracker) {
      // nothing interesting on screen, just return null
      return null;
    }

    const ret: FullContentPosition = {
      start: {
        entryIdx: firstLineTracker.entryIdx.toString(),
        paragraphID: this.context.getParagraphIDFromEntryIdx(firstLineTracker.entryIdx) as string,
        charIdx: firstLineTracker.charStart,
      },
      end: {
        entryIdx: lastLineTracker.entryIdx.toString(),
        paragraphID: this.context.getParagraphIDFromEntryIdx(lastLineTracker.entryIdx) as string,
        charIdx: lastLineTracker.charEnd,
      },
    };

    return ret;
  }

  // lastEntryIdx of -1 means it is not in a layer, just a normal paragraph
  private addChildren = (entryIdx: number, lastEntryIdx: number, extendUp: boolean, refLayerExtBorder: boolean): LayoutNodeData | null => {
    let reactElem: JSX.Element | undefined;
    const parsedData = this.context.getRawParsedData();
    const entry : ReaderParse.Entry = parsedData.entries[entryIdx];

    if (lastEntryIdx >= 0) {
      // In a layer?
      reactElem = <Layer firstEntryIdx={entryIdx} lastEntryIdx={lastEntryIdx}/>;
    } else {
      lastEntryIdx = entryIdx;
      switch (entry.type) {
        case EntryTypes.paragraph:
          if (entry.id === 'cover') {
            reactElem = <BookCoverReader/>;
          } else {
            reactElem = <ContentParagraph entryIdx={entryIdx} paragraph={entry} refLayerExtBorder={refLayerExtBorder}/>;
          }
          break;
        case EntryTypes.images:
          reactElem = <ImageSet entryIdx={entryIdx} />;
          break;
        case EntryTypes.commentSummary:
          reactElem = <CommentSummary entryIdx={entryIdx} />;
          break;
        case EntryTypes.preview:
          reactElem = <ReaderPreviewInsert />;
          break;
        case EntryTypes.terminator:
          reactElem = <ReaderTerminator />;
          break;
        case EntryTypes.authorNote:
        case EntryTypes.button:
        case EntryTypes.data:
          return null;
        default:
          Util.absurd(entry);
          return null;
      }
    }
    if (reactElem) {
      const reactRoot = <ContextProvider context={this.context}>{reactElem}</ContextProvider>;
      const layout = renderToLayout(undefined, reactRoot, this, {
        entryIdx,
        lastEntryIdx,
        scrollHandler: this.scrollHandler,
      });
      layout.setExternalConstraints({ min: { width: this.width }, max: { width: this.width } });
      layout.layoutIfNeeded();
      const child = layout.getLayoutData();
      if (extendUp) {
        this.children.unshift(child);
      } else {
        this.children.push(child);
      }
      return child;
    }
    return null;
  }

  private setTargetScaleFactor = (scaleFactor: number) => {
    this.swipeHandler.setTargetScaleFactor(scaleFactor);
  }

  private setAnchorIdx = (anchorEntryIdx: number) => {
    this.anchorEntryIdx = anchorEntryIdx;
    this.anchorOffset = 0;
    this.scrollHandler.resetScrollY();
    this.lastScrollY = this.getScrollTop();

    const pageHeight = this.getHeight();
    for (const child of this.children) {
      child.node.destructor();
    }
    this.children = []; // TODO, smarter re-cache
    this.bookEdgeBeginning = this.bookEdgeEnd = null;
    this.visibleLayoutStart = 0;
    this.extendDown(pageHeight);
    this.visibleLayoutEnd = this.children.length - 1;
    this.setDirty();
    this.layoutIfNeeded(); // helper so that anything looking at layouts is not confused
    this.setDirty(); // set dirty again so the render happens.
  }

  public scrollTo = (params: ScrollToParams) => {
    let scrollY = 0;
    this.setAnchorIdx(params.entryIdx);

    const firstChar = params.firstChar || 0;
    if (firstChar && this.children.length) {
      // first find the layout corresponding to this character. if you find it, set the scroll to match
      this.walkLayoutTrackers(this.children[0], 'line', (node: LayoutNode): Constants.TreeWalkerCBResult => {
        const info: LayoutTrackerLine = node.dataProps.layoutTracker;
        if (firstChar >= info.charStart && firstChar < info.charEnd) {
          scrollY = node.getScreenOffset().y;
          return Constants.TREE_WALKER_CB_RESULT.DONE; // done, stop looking!
        }
        return Constants.TREE_WALKER_CB_RESULT.DONT_DESCEND; // won't be under this layout, but keep looking
      });
    }
    this.scrollHandler.setTargetScrollY(scrollY, 0, 'linear', params.metric);
  }

  // Jumps if necessary
  private findLayoutFromEntryIdx = (entryIdx: number): LayoutNode | undefined => {
    for (let layoutIdx = this.visibleLayoutStart; layoutIdx <= this.visibleLayoutEnd; ++layoutIdx) {
      const node = this.children[layoutIdx].node;
      if (node.dataProps.entryIdx === entryIdx) {
        return node;
      }
    }
    return undefined;
  }

  private navTo = (target: Nav.NavTarget, placement: Nav.NavPlacement, instant: boolean, navMetric?: string ) => {

    // First, find the layout node we are targeting based on NavTarget
    // If it is not currently in the children we need to jump to it.

    const curAnchorIdx = this.children[this.visibleLayoutStart].node.dataProps.entryIdx; // Log current pos since we might jump.
    let targetNode: LayoutNode | undefined;
    let didJump: boolean = false;
    switch (target.type) {
      case 'selection': {
        targetNode = this.context.getSelectedThread();
        break;
      }
      case 'paragraph': {
        const entryIdx = target.entryIdx;
        targetNode = this.findLayoutFromEntryIdx(entryIdx);
        if (!targetNode) {
          // Can't find it, so jump
          this.setAnchorIdx(entryIdx);
          targetNode = this.children[0].node;
          didJump = true;
        }
        break;
      }
      case 'comment': {
        const entryIdx = target.entryIdx;
        targetNode = this.findLayoutFromEntryIdx(entryIdx);
        if (!targetNode) {
          // Can't find it, so jump
          this.setAnchorIdx(entryIdx);
          targetNode = this.children[0].node;
          didJump = true;
        }
        // refine targetNode to the comment (not the parent layout)
        this.walkLayoutTrackers(targetNode.getLayoutData(), 'comment', (node: LayoutNode) => {
          if (node.dataProps.layoutTracker && node.dataProps.layoutTracker.type === 'comment') {
            const layoutTracker: LayoutTrackerComment = node.dataProps.layoutTracker;
            if (
              layoutTracker.sentenceIdx === target.sentenceIdx &&
              layoutTracker.commentID === target.commentID
            ) {
              targetNode = node;
              return Constants.TREE_WALKER_CB_RESULT.DONE;
            }
          }
          return Constants.TREE_WALKER_CB_RESULT.DONT_DESCEND;
        });
        break;
      }
      default: {
        Log.error('@sam', 'unhandled.nav.target', {target, placement});
        return;
      }
    }

    if (!targetNode) {
      Log.error('@sam', 'nav.no.targetNode', {target, placement});
      return;
    }

    // Next find the scroll spot we want based on NavPlacement (targetScrollY)
    const pageHeight = this.context.getUIState(null, ['page', 'height']) as number;
    let targetScrollY = 0;

    switch (placement) {
      case Nav.NAV_PLACEMENT.BOTTOM: {
        const layoutData = targetNode.getLayoutData();
        const bottomLayoutY = (targetNode.getScreenOffset().y + this.anchorOffset) + layoutData.renderDims.height;
        targetScrollY = this.convertLayoutToScrollY(bottomLayoutY - pageHeight + this.context.calcBottomUXOffset(null));
        break;
      }
      case Nav.NAV_PLACEMENT.TOP: {
        const topLayoutY = targetNode.getScreenOffset().y + this.anchorOffset;
        targetScrollY = this.convertLayoutToScrollY(topLayoutY - LAYOUT_CONSTANTS.TOP_BAR_HEIGHT);
        break;
      }
      default: {
        Log.error('@sam', 'nav.unhandled.placement', { target, placement });
        return;
      }
    }

    // Only scroll selection up (when hidden under the bottom bar)
    if (target.type === 'selection' && targetScrollY < this.scrollHandler.getScrollY()) {
      return;
    }

    // Jump straight there, skip all this sliding stuff below
    if (instant) {
      this.scrollHandler.setTargetScrollY(targetScrollY, 0, 'linear', navMetric);
      return;
    }

    // We're sliding, so calculate whether we jumped and need to fake an offset so we appear to slide into where we are going
    // This also will adjust the scroll time
    let scrollTime = SCROLL_ANIMATION_TIME;
    let easeFunc: MathUtils.EasingFunction = 'easeInOutQuad';
    if (didJump) {
      easeFunc = 'easeOutQuad';
      const parsedData = this.context.getRawParsedData();
      const newAnchorIdx = this.children[0].node.dataProps.entryIdx;

      // This is a rough estimate of the percentage of the book you are jumping
      const diffPct = (newAnchorIdx - curAnchorIdx) / parsedData.entries.length;
      // <2% quick, <10% < medium, otherwise slow. Adjust both the time and the offset
      let startOffset = -MathUtils.sign(diffPct) * pageHeight * 3;
      if (Math.abs(diffPct) < 0.02) {
        scrollTime = SCROLL_ANIMATION_TIME;
      } else if (Math.abs(diffPct) < 0.1) {
        scrollTime = SCROLL_ANIMATION_TIME * 2;
        startOffset *= 2;
      } else {
        scrollTime = SCROLL_ANIMATION_TIME * 4;
        startOffset *= 3;
      }

      // Apply the offset
      this.scrollHandler.resetScrollY(startOffset);
    }

    // Do the scroll!
    this.scrollHandler.setTargetScrollY(targetScrollY, scrollTime, easeFunc, navMetric);
  }

  private setDirty = (): void => {
    this.layoutsDirty = true;
    CanvasRenderer.kickRender();
  }

  private calcVisibleLayouts() {
    this.visibleLayoutStart = this.findLayoutIdxAtY(this.anchorOffset - 100);

    const pageHeight = this.getHeight();
    const scaleFactor = this.getScaleFactor();
    const bottom = this.anchorOffset + pageHeight / scaleFactor;
    this.visibleLayoutEnd = this.findLayoutIdxAtY(bottom + 100);

    const midIdx = this.findLayoutIdxAtY(this.anchorOffset + 0.5 * pageHeight / scaleFactor);
    const entryIdx = this.children[midIdx].node.dataProps.entryIdx;
    const parsedData = this.context.getRawParsedData();
    this.context.replaceUIState(['curPos'], parsedData.entries[entryIdx].charsSoFar);
  }

  private updateLastReads() {
    const parsedData = this.context.getRawParsedData();

    // Update the thread read status for every paragraph on the screen
    // TODO: make this less terrible, specifically by only updating if we're rendering a specific thread
    for (let idx = this.visibleLayoutStart; idx <= this.visibleLayoutEnd; ++idx) {
      const eIdx = this.children[idx].node.dataProps.entryIdx;
      const entry: ReaderParse.Entry = parsedData.entries[eIdx];
      if (entry.type === EntryTypes.preview) {
        this.context.recordPreviewMetric();
      }
      if (entry.type === EntryTypes.paragraph) {
        this.context.updateParagraphLastRead(entry.id);
      }
    }
  }

  private bufferLayouts() {
    const pageHeight = this.getHeight();
    const scaleFactor = this.getScaleFactor();
    const scaledPageHeight = pageHeight / scaleFactor;

    // findLayoutIdxAtY will automatically extendUp and extendDown
    const bufferStart = this.findLayoutIdxAtY(this.anchorOffset - BACK_BUFFER_PAGES * scaledPageHeight);
    const bufferEnd = this.findLayoutIdxAtY(this.anchorOffset + (1 + FORWARD_BUFFER_PAGES) * scaledPageHeight);

    // trim the fat
    const backTrim = bufferStart;
    const forwardTrim = this.children.length - bufferEnd - 1;
    if (!backTrim && !forwardTrim) {
      return;
    }

    this.visibleLayoutStart -= backTrim;
    this.visibleLayoutEnd -= backTrim;
    for (let i = 0; i < bufferStart; ++i) {
      this.children[i].node.destructor();
    }
    for (let i = bufferEnd + 1; i < this.children.length; ++i) {
      this.children[i].node.destructor();
    }
    this.children = this.children.slice(bufferStart, bufferEnd + 1);
  }

  private getAnchorNodeIndex() {
    // find anchorIdx TODO bsearch or just track it
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].node.dataProps.entryIdx === this.anchorEntryIdx) {
        return i;
      }
    }
    return 0;
  }

  private reanchor() {
    let idx = this.getAnchorNodeIndex();
    let changed = false;
    while (idx < this.children.length - 1 && this.anchorOffset > this.children[idx].renderDims.height) {
      this.anchorOffset -= this.children[idx].renderDims.height;
      idx++;
      changed = true;
    }
    while (idx > 0 && this.anchorOffset < 0) {
      idx--;
      this.anchorOffset += this.children[idx].renderDims.height;
      changed = true;
    }

    if (changed) {
      this.anchorEntryIdx = this.children[idx].node.dataProps.entryIdx;
      this.setDirty();
    }
  }

  public layoutIfNeeded(): boolean {
    if (!this.layoutsDirty) {
      return false;
    }
    this.layoutsDirty = false;

    const idx = this.getAnchorNodeIndex();
    this.children[idx].node.layoutIfNeeded();
    this.children[idx].computedOffset.y = 0;

    for (let i = idx - 1; i >= 0; i--) {
      this.children[i].node.layoutIfNeeded();
      let y = this.children[i + 1].computedOffset.y;
      this.children[i].computedOffset.y = (y - this.children[i].renderDims.height);
    }

    for (let i = idx + 1; i < this.children.length; i++) {
      this.children[i].node.layoutIfNeeded();
      let y = this.children[i - 1].computedOffset.y;
      this.children[i].computedOffset.y = (y + this.children[i - 1].renderDims.height);
    }

    this.overlayParent.layoutIfNeeded();
    this.uxLayout.layoutIfNeeded();
    return true;
  }

  private walkLayoutTrackers = (
    layout: LayoutNodeData,
    type: LayoutTracker['type'],
    cb: (node: LayoutNode) => Constants.TreeWalkerCBResult) => {
    const cbResult: Constants.TreeWalkerCBResult = layout.node.walkDownTree((node: LayoutNode): Constants.TreeWalkerCBResult => {
      if (node.dataProps.layoutTracker && node.dataProps.layoutTracker.type === type) {
        return cb(node);
      }
      return Constants.TREE_WALKER_CB_RESULT.CONTINUE;
    });
    return cbResult;
  }

  private walkVisibleLayoutTrackers = (type: LayoutTracker['type'], cb: (node: LayoutNode) => Constants.TreeWalkerCBResult) => {
    // walk visible layouts to find it
    for (let layoutIdx = this.visibleLayoutStart; layoutIdx <= this.visibleLayoutEnd; ++layoutIdx) {
      const layout = this.children[layoutIdx];
      const cbResult: Constants.TreeWalkerCBResult = this.walkLayoutTrackers(layout, type, cb);
      if (cbResult === Constants.TREE_WALKER_CB_RESULT.DONE) { // early out?
        return;
      }
    }
  }

  private calcContentWindowTop = () : number => {
    const pageHeight = this.getHeight();
    const scaleFactor = this.getScaleFactor();
    const bottomBarHeight = this.context.getUIState(null, ['bottomBarHeight']);
    const topBarHeight = LAYOUT_CONSTANTS.TOP_BAR_HEIGHT;
    const windowHeight = Math.max(pageHeight - topBarHeight - bottomBarHeight, 0);
    return (pageHeight / scaleFactor - windowHeight) / 2;
  }

  private calcContentWindowHeight = () => {
    const pageHeight = this.getHeight();
    const bottomBarHeight = this.context.getUIState(null, ['bottomBarHeight']);
    const topBarHeight = LAYOUT_CONSTANTS.TOP_BAR_HEIGHT;
    return Math.max(pageHeight - topBarHeight - bottomBarHeight, 0);
  }

  private getSentenceClosestToMiddle = (): LayoutTrackerSentence | undefined => {
    const pageHeight = this.getHeight();
    const midPoint = pageHeight * 0.5;

    let closestLayoutTracker: LayoutTrackerSentence | undefined;
    let closestDistance: number = Infinity;

    this.walkVisibleLayoutTrackers('sentence', (node: LayoutNode): Constants.TreeWalkerCBResult => {
      const nodeLayout = node.getLayoutData();
      const top = node.getScreenOffset().y;
      const bottom = top + nodeLayout.renderDims.height;
      let dist: number;
      if (midPoint < top) {
        dist = top - midPoint;
      } else if (midPoint > bottom) {
        dist = midPoint - bottom;
      } else {
        dist = 0;
      }
      if (dist < closestDistance) {
        closestLayoutTracker = node.dataProps.layoutTracker;
        closestDistance = dist;
      }
      return Constants.TREE_WALKER_CB_RESULT.DONT_DESCEND;
    });

    return closestLayoutTracker;
  }

  private selectSentenceClosestToMiddle = (activeBar?: string): boolean => {
    const closestLayoutTracker = this.getSentenceClosestToMiddle();
    if (closestLayoutTracker) {
      this.context.selectSentence(closestLayoutTracker.entryIdx, closestLayoutTracker.sentenceIdx, activeBar);
    }
    return false;
  }

  public onStoppedRendering = () => {
    this.reanchor();
    this.updateLastReads();
  }

  public onBuffering = () => {
    this.bufferLayouts();
  }

  public render = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    this.layoutIfNeeded();

    const scrollY = this.getScrollTop();
    const deltaY = scrollY - this.lastScrollY;
    this.lastScrollY = scrollY;
    this.anchorOffset += deltaY;

    const scaleFactor = this.getScaleFactor();

    this.calcVisibleLayouts();
    this.context.processPostLayoutCBs();

    this.drawInternal(ctx, canvasWidth, canvasHeight, scaleFactor);
  }

  private drawWindowBox(ctx: CanvasRenderingContext2D, scaleFactor: number) {
    const uiAlpha = this.context.getUIAlpha(null);
    const alpha = 1 - uiAlpha;
    if (!alpha) {
      return;
    }

    const topBarHeight = LAYOUT_CONSTANTS.TOP_BAR_HEIGHT;
    const bottomBarHeight = this.context.getUIState(null, ['bottomBarHeight']);

    const windowHeight = Math.max(this.height - topBarHeight - bottomBarHeight, 0) * scaleFactor;
    const windowWidth = this.width * scaleFactor;
    const yOffset = ((this.height / scaleFactor - this.height) / 2 + topBarHeight) * scaleFactor;

    const borderColor = ColorConstants.readerColors.readerText.rgb().string();

    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      0,
      yOffset,
      windowWidth,
      windowHeight,
    );
  }

  private drawInternal(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, scaleFactor: number) {
    ctx.save();
    {
      const bgColor = ColorConstants.readerColors.readerBackground.rgb().string();

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.scale(Util.PIXEL_RATIO, Util.PIXEL_RATIO);

      ctx.save();
      {
        ctx.scale(scaleFactor, scaleFactor);
        ctx.translate(0, -this.anchorOffset);
        for (let layoutIdx = this.visibleLayoutStart; layoutIdx <= this.visibleLayoutEnd; ++layoutIdx) {
          this.children[layoutIdx].node.draw(ctx);
        }
        this.overlayParent.draw(ctx);
      }
      ctx.restore();

      ctx.save();
      {
        this.uxLayout.draw(ctx);
      }
      ctx.restore();

      ctx.save();
      {
        this.drawWindowBox(ctx, scaleFactor);
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
