/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { LayoutTrackerSentence, LayoutTrackerLine } from 'clientjs/components/CanvasReader/LayoutTracker';
import * as ParagraphUtils from 'clientjs/components/CanvasReader/ParagraphUtils';
import { ReaderSelection } from 'clientjs/components/CanvasReader/UIState';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import * as Constants from 'clientjs/shared/constants';
import { READER_COLOR } from 'clientjs/shared/constants';
import * as ParagraphTypes from 'clientjs/shared/paragraphTypes';
import { Modifiers, Types } from 'clientjs/shared/paragraphTypes';
import { APP_SIZE } from 'overlib/client/appCommon';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { FontDesc } from 'overlib/client/components/Layout/Font';
import { AnimationDef } from 'overlib/client/components/Layout/LayoutAnimator';
import * as LayoutDrawable from 'overlib/client/components/Layout/LayoutDrawable';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const CHAT_PADDING = 15;
const CHAT_MARGIN = 20;

const BULLETS = [
  '\u25CF',
  '\u25CB',
  '\u25C6',
  '\u25C7',
  '\u25A0',
  '\u25A1',
];

const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';

function getOrdinalStr(ordinality: number, tabLevel: number): string {
  if (tabLevel % 2 === 1) {
    return ordinality + '.';
  }
  return alphabet[(ordinality - 1) % alphabet.length] + '.';
}

interface TextRangeProps {
  text: string;
  charStart: number;
  charEnd: number;
  xPos: number;
  width: number;
  font: FontDesc;
  widget?: ParagraphTypes.Modifier;
  sentenceIdx: number;
  entryIdx?: number;
  threadSentence?: {createUser: AccountID, comments: StashOf<{userID: AccountID}>, reactions: Stash};
  onSentenceTap?: (sentenceIdx: number) => boolean;

  groupID: Constants.ReactionGroupID;
  isSelected: boolean;
}

class TextRange extends DataWatcher<TextRangeProps, {}> {
  private onClick = () => {
    this.props.onSentenceTap && this.props.onSentenceTap(this.props.sentenceIdx);
  }

  render() {
    const style: Stash = {
      left: this.props.xPos,
      width: this.props.width,
      maxWidth: this.props.width,
    };

    let classes = 'ai-s';
    let contentClasses = '';

    let underline: JSX.Element | null = null;
    let layoutTracker: LayoutTrackerSentence | undefined;
    const anims: AnimationDef[] = [];

    if (this.props.entryIdx !== undefined) {
      const userID = DB.getAccountID();
      const groupID = this.props.groupID;
      const color = UserColors.getUserColor(this, groupID, userID);

      const isSelected = this.props.isSelected;
      if (isSelected) {
        contentClasses += ` c-${color.inlineBase}-bg-a0.5`;
        anims.push({
          key: 'selectionOn',
          motivator: {
            source: 'time',
            easingFunction: 'easeInOutQuart',
            start: 0,
            end: 250,
          },
          modifier: {
            field: 'backgroundColor',
            start: '0%',
            end: '100%',
          },
        });
      }

      if (this.props.threadSentence) {
        const fontObj = LayoutDrawable.getFontManager().getFont(this.props.font);
        const underlineColor = UserColors.getUserColor(this, groupID, this.props.threadSentence.createUser);
        const underlineStyle = {
          top: fontObj.fontMetrics.lineBottom,
          backgroundColor: underlineColor.inlineBase,
        };
        underline = <div classes='h-1' style={underlineStyle} />;
      }

      layoutTracker = {
        type: 'sentence',
        entryIdx: this.props.entryIdx,
        sentenceIdx: this.props.sentenceIdx,
        charStart: this.props.charStart,
        charEnd: this.props.charEnd,
      };
    }


    let content: JSX.Element | string = this.props.text;
    if (this.props.widget) {
      const lineHeight = this.props.font.lineSpacing * this.props.font.fontSize;
      if (ParagraphTypes.isImgWidgetModifier(this.props.widget)) {
        content = (
          <img
            src={this.props.widget.data.url}
            style={{ width: this.props.width, height: lineHeight }}
          />
        );
      } else if (ParagraphTypes.isEmojiWidgetModifier(this.props.widget)) {
        content = (
          <svg
            name={this.props.widget.data.name}
            style={{ width: this.props.width, height: lineHeight }}
          />
        );
      }
    }

    return (
      <div style={style} classes={classes} data-layoutTracker={layoutTracker}>
        <div
          style={this.props.font}
          classes={contentClasses}
          onClick={this.props.onSentenceTap ? this.onClick : undefined}
          data-anims={anims}
        >
          {content}
        </div>
        {underline}
      </div>
    );
  }
}

function typeset(
  content: string,
  segments: ParagraphUtils.TextSegment[],
  entryIdx: number | undefined,
  threadSentences: StashOf<{createUser: AccountID, comments: Stash, reactions: Stash}> | undefined,
  groupID: Constants.ReactionGroupID,

  maxTextWidth: number,
  alignment: number,
  leadingIndent: number,

  getSelection: (entryIdx: number) => ReaderSelection | undefined,
  onSentenceTap?: (sentenceIdx: number) => boolean,
): JSX.Element[] {
  const layoutLines = ParagraphUtils.layoutParagraph(content, segments, maxTextWidth, alignment === -1 ? leadingIndent : 0);
  const jsxLines: JSX.Element[] = [];

  for (const line of layoutLines) {
    const outLine: JSX.Element[] = [];

    for (const elem of line.elems) {
      const sentenceIdx = elem.sentenceIdx!;
      const threadSentence = (threadSentences && threadSentences[sentenceIdx]) || undefined;

      const selectionObj = entryIdx && getSelection(entryIdx);
      const isSelected = (selectionObj && selectionObj.index) === sentenceIdx;

      outLine.push((
        <TextRange
          key={elem.key}
          text={elem.text}
          charStart={elem.charStart}
          charEnd={elem.charEnd}
          font={elem.font}
          widget={elem.widget}
          xPos={elem.xPos}
          width={elem.width}
          sentenceIdx={sentenceIdx}
          entryIdx={entryIdx}
          threadSentence={threadSentence}
          onSentenceTap={onSentenceTap}
          groupID={groupID}
          isSelected={isSelected}
        />
      ));
    }

    const lineContent: JSX.Element[] = [];

    if (alignment >= 0) {
      lineContent.push(<div key='leftSpacer' classes='fg-1' />);
    }
    lineContent.push(<span key='lineText'>{outLine}</span>);
    if (alignment === 0) {
      lineContent.push(<div key='rightSpacer' classes='fg-1' />);
    }


    let layoutTracker: LayoutTrackerLine | undefined;
    if (entryIdx) {
      layoutTracker = {
        type: 'line',
        entryIdx: entryIdx,
        charStart: line.charStart,
        charEnd: line.charEnd,
      };
    }

    jsxLines.push(<Flex.Row key={line.key} data-layoutTracker={layoutTracker}>{lineContent}</Flex.Row>);
  }

  return jsxLines;
}

interface ParagraphProps {
  paragraph: ParagraphUtils.ParagraphData;
  entryIdx?: number;
  classes?: string;
  startSentence?: number;
  endSentence?: number;
  threadSentences?: StashOf<{createUser: AccountID, comments: Stash, reactions: Stash}>;
  paddingLeft?: number;
  paddingRight?: number;
  onSentenceTap?: (sentenceIdx: number) => boolean;
  onClick?: () => void;
  font? : FontDesc;
  extraMissingWidth?: number; // hack for when the paragraph is squeezed in somewhere with less room than page width
  refLayerExtBorder?: boolean;
}

export class Paragraph extends DataWatcher<ParagraphProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  render() {
    const paraIndent = this.props.paragraph.tabLevel || 0;

    let paraType: string = this.props.paragraph.type;
    let gutterStr = '';
    let leadingIndent = 0;
    if (this.props.paragraph.modifiers) {
      for (const mod of this.props.paragraph.modifiers) {
        if (mod.type === Modifiers.LAYER && paraType === 'paragraph') {
          paraType = 'layer';
        }
        if (!this.props.startSentence) {
          if (mod.type === Modifiers.INDENT) {
            leadingIndent = 1;
          }
          if (mod.type === Modifiers.BULLET && paraIndent) {
            gutterStr = BULLETS[paraIndent - 1];
          }
          if (mod.type === Modifiers.NUMBER && paraIndent) {
            gutterStr = getOrdinalStr(this.props.paragraph.ordinality || 1, paraIndent);
          }
        }
      }
    }
    const fontDesc = this.props.font || this.context.readerContext.getFontStyle(this, paraType) as FontDesc;
    const oneTab = fontDesc.fontSize * 1.5;
    const segmentsAndModData = ParagraphUtils.getParagraphSegments(
      this.props.paragraph,
      LayoutDrawable.getFontManager(),
      fontDesc,
      this.props.startSentence,
      this.props.endSentence,
    );
    const paraImage = segmentsAndModData.paraImage;
    const segments = segmentsAndModData.segments;
    if (!segments.length) {
      return null;
    }

    const paddingLeft = (this.props.paddingLeft || 0) + paraIndent * oneTab;
    const paddingRight = this.props.paddingRight || 0;
    const availableWidth = this.context.readerContext.getUIState(this, ['page', 'width']) - paddingLeft - paddingRight;

    let imageWidth = 0;
    let imagePadding = 0;
    if (paraImage && paraImage.alignment !== 0) {
      if (this.getData(['App', 'appSize']) === APP_SIZE.LARGE) {
        imageWidth = availableWidth * 0.2;
      } else {
        imageWidth = availableWidth * 0.25;
      }
      imagePadding = paraImage.alignment < 0 ? paddingRight : paddingLeft;
    }

    let maxTextWidth = availableWidth - imageWidth - imagePadding - (this.props.extraMissingWidth || 0);
    if (paraType === Types.CHATLEFT || paraType === Types.CHATRIGHT) {
      maxTextWidth -= (CHAT_MARGIN + CHAT_PADDING);
    }
    const content: string = this.props.paragraph.content;

    const lines = typeset(
      content,
      segments,
      this.props.entryIdx,
      this.props.threadSentences,
      this.context.readerContext.getGroupID(),
      maxTextWidth,
      segmentsAndModData.alignment,
      leadingIndent * oneTab,
      (entryIdx) => this.context.readerContext.getEntrySelection(this, entryIdx.toString()),
      this.props.onSentenceTap,
    );

    if (!lines.length && !paraImage) {
      return null;
    }

    let elems: JSX.Element | JSX.Element[] = lines;
    if (paraImage) {
      const renderWidth = paraImage.alignment === 0 ? availableWidth * 0.8 : imageWidth;
      const renderHeight = renderWidth * paraImage.h / paraImage.w;
      const imageStyle = {
        width: renderWidth,
        height: renderHeight,
        paddingLeft: paraImage.alignment === 1 ? imagePadding : 0,
        paddingRight: paraImage.alignment === -1 ? imagePadding : 0,
      };
      if (paraImage.alignment === 0) {
        // deprecated, see ImageSet.tsx
      } else if (paraImage.alignment === -1) {
        elems = (
          <Flex.Row classes='ai-fs'>
            <img src={paraImage.url} style={imageStyle}/>
            <div classes='fg-1'>
              {lines}
            </div>
          </Flex.Row>
        );
      } else {
        elems = (
          <Flex.Row classes='ai-fs'>
            <div classes='fg-1'>
              {lines}
            </div>
            <img src={paraImage.url} style={imageStyle}/>
          </Flex.Row>
        );
      }
    }

    const hasText = Boolean(content.length > 0 && content.match(/\S+/));
    if (gutterStr) {
      const gutterStyle = Util.clone(fontDesc) as Stash;
      gutterStyle.left = Math.round(-0.65 * oneTab) + 'px';
      elems = <span><div style={gutterStyle}>{gutterStr}</div><div>{elems}</div></span>;
    }

    let classes = Util.combineClasses(`p-l-${paddingLeft} p-r-${paddingRight}`, this.props.classes);
    switch (paraType) {
      case Types.CHATLEFT:
        const bubbleColorL = this.context.readerContext.getReaderColorMode(this) === READER_COLOR.DARK ? 'charcoal' : 'smoke';
        const bubbleClassesL = `br-20 p-x-${CHAT_PADDING} p-y-5 m-r-${CHAT_MARGIN} c-${bubbleColorL}-bg ww-b`;
        const svgStyleL = `pos-a left--7 bot--5 w-25 h-25 c-${bubbleColorL}-f`;
        classes = Util.combineClasses(classes, 'p-l-20 as-fs pos-r');
        return (
          <div classes={classes} data-cacheable={hasText} onClick={this.props.onClick}>
            <div classes={bubbleClassesL}>
              {elems}
            </div>
            <svg classes={svgStyleL} name='icons/layer_tail-left.svg'/>
          </div>
        );
      case Types.CHATRIGHT:
        const bubbleColorR = this.context.readerContext.getReaderColorMode(this) === READER_COLOR.DARK ? 'gandalf' : 'iron';
        const bubbleClassesR = `br-20 p-x-${CHAT_PADDING} p-y-5 m-l-${CHAT_MARGIN} c-${bubbleColorR}-bg ww-b`;
        const svgStyleR = `pos-a right--7 bot--5 w-25 h-25 c-${bubbleColorR}-f`;
        classes = Util.combineClasses(classes, 'p-r-20 as-fe pos-r');
        return (
          <div classes={classes} data-cacheable={hasText} onClick={this.props.onClick}>
            <div classes={bubbleClassesR}>
              {elems}
            </div>
            <svg classes={svgStyleR} name='icons/layer_tail-right.svg'/>
          </div>
        );
      case Types.CHATHEADER:
        classes = Util.combineClasses(classes, 'm-b--23 m-x-2 c-gandalf-fg');
        return (
          <div classes={classes} data-cacheable={hasText} onClick={this.props.onClick}>
            {elems}
          </div>
        );
      case Types.REFERENCE:
        classes = Util.combineClasses(classes, 'ai-c p-y-0 pos-r');
        const elemLength = (elems as JSX.Element[]).length || 1;
        const borderClasses = `h-${fontDesc.fontSize * elemLength * fontDesc.lineSpacing} w-n-3 c-readerPrimary-bg`;
        const borderExtClasses = `pos-a h-${fontDesc.fontSize * fontDesc.lineSpacing} w-n-3 c-readerPrimary-bg left-0 top--25`;
        return (
          <div classes={classes}>
            { this.props.refLayerExtBorder ? <div classes={borderExtClasses}/> : null }
            <Flex.Row>
              <div classes={borderClasses}/>
              <div classes=' m-l-10' data-cacheable={hasText} onClick={this.props.onClick}>
                {elems}
              </div>
            </Flex.Row>
          </div>
        );
      default:
        return (
          <div classes={classes} data-cacheable={hasText} onClick={this.props.onClick}>
            {elems}
          </div>
        );
    }
  }
}

interface TextProps {
  font: FontDesc;
  width: number;
  style?: React.CSSProperties;
  classes?: string;
}

export class Text extends React.Component<TextProps> {
  render() {
    if (typeof this.props.children !== 'string') {
      throw new Error('Text cannot handle child components!  Text only');
    }


    const {segments, alignment} = ParagraphUtils.getParagraphSegments(
      {type: 'paragraph', content: this.props.children},
      LayoutDrawable.getFontManager(),
      this.props.font,
      undefined,
      undefined,
    );

    const res = typeset(
      this.props.children,
      segments,
      undefined,
      undefined,
      '' as Constants.ReactionGroupID, // groupID
      this.props.width,
      alignment,
      0,
      () => undefined,
      undefined,
    );

    return <Flex.Col style={this.props.style} classes={this.props.classes}>{res}</Flex.Col>;
  }
}
