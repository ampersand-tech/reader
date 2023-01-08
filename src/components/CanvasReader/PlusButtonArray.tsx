/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { NoteButtonID } from 'clientjs/components/CanvasReader/UIState';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import * as IpcClientUtil from 'clientjs/ipcClientUtil';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import * as QuotesDB from 'clientjs/shared/quotesDB';
import { EntryTypes } from 'clientjs/shared/readerParse';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { SvgIcon } from 'overlib/client/components/SvgIcon.tsx';
import * as Navigation from 'overlib/client/navigation';
import * as MathUtils from 'overlib/shared/mathUtils';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const BIG_RADIUS = 27;
const SUB_RADIUS = 26;
const ARRAY_RADIUS = 140;

function circle(r: number): string {
  return `w-${r * 2} h-${r * 2} br-${r}`;
}

interface SubButtonProps {
  icon: string;
  classes?: string;
  onClick?: () => void;
  showing: boolean;
  idx: number;
  total: number;
  label: string;
  color: string;
}
class SubButton extends DataWatcher<SubButtonProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  render() {
    const RDIFF = BIG_RADIUS - SUB_RADIUS;
    const iconSz = Math.round(SUB_RADIUS * 1.1 * 0.5) * 2; // make sure it's an even number for centering purposes
    const angle = (this.props.idx / (this.props.total - 1)) * Math.PI * 0.5;
    const x = RDIFF - (this.props.showing ? Math.cos(angle) * ARRAY_RADIUS : 0);
    const y = RDIFF - (this.props.showing ? Math.sin(angle) * ARRAY_RADIUS : 0);
    const labelOP = this.props.showing ? '1' : '0';

    const p = MathUtils.parameterize(0, this.props.total - 1, this.props.idx);
    const transTime = MathUtils.interp(0.15, 0.25, p);
    return (
      <Flex.Col classes={`pos-a trans-t-l-${transTime}s left-${x} top-${y} cc`} onClick={this.props.onClick}>
        <Flex.Col
          classes={
            Util.combineClasses(
              `c-${this.props.color}-bg cc ${circle(SUB_RADIUS)} bxshdw-2-2-3-5-rgba[0,0,0,0.2] `,
              this.props.classes,
            )
          }
        >
          <SvgIcon classes={`c-white-f w-${iconSz} h-${iconSz}`} svgName={this.props.icon} />
        </Flex.Col>
        <div classes={`pos-a bot--20 op-${labelOP} ta-c c-readerText-fg fw-500`}>
         {this.props.label}
        </div>
      </Flex.Col>
    );
  }
}

export class PlusButtonArray extends DataWatcher<{noShare?: boolean}, {shareSupported: boolean}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  state = { shareSupported: false };

  componentWillMount() {
    super.componentWillMount();
    if (this.props.noShare) {
      // no sharing
    } else if (!Util.isNativeApp()) {
        this.setState({shareSupported: true}); // desktop can save the file
    } else {
      IpcClientUtil.isSupported('shareImage', (_err, res) => {
        this.setState({shareSupported: !!res});
      });
    }
  }

  private onClickReaction = () => {
    this.context.readerContext.ensureSelection('sentiment');
    this.context.readerContext.replaceUIState(['showReactionBar'], true);
    this.toggleOpen();
  }

  private onClickComment = () => {
    this.context.readerContext.ensureSelection(NoteButtonID);
    this.toggleOpen();
  }

  private onClickShare = () => {
    let selection = this.context.readerContext.getSelection(null);
    if (!selection) {
      return;
    }

    const selectedIdx = parseInt(selection.entryIdx, 10);
    if (!Util.isNumber(selectedIdx)) {
      return;
    }

    const parsedData = this.context.readerContext.getRawParsedData();
    const entry = parsedData.entries[selectedIdx];
    if (entry.type !== EntryTypes.paragraph) {
      return;
    }

    const content = entry.content.substr(selection.start, selection.length);

    const title = this.context.readerContext.getContentItemData(this, ['title']);
    const author = this.context.readerContext.getAuthorName(null);

    const quote: QuotesDB.Quote = {content, title, author};

    Navigation.go(ReaderRoutes.quote0(encodeURIComponent(Util.safeStringify(quote))));
  }

  private toggleOpen = () => {
    const isOpen = this.context.readerContext.getUIState(null, ['plusButtonOpen'], 1);
    const activeBar = this.context.readerContext.getUIState(null, ['activeBar']);
    const reactionBar = this.context.readerContext.getUIState(null, ['showReactionBar']);
    this.context.readerContext.replaceUIState(['plusButtonOpen'], !isOpen);

    // toggleOpen is called after bars are set but before bars are rendered.
    if (!activeBar && !reactionBar) {
      // clicking the plus button should select/deselect sentence.
      if (!isOpen) {
        this.context.readerContext.autoSelectSentence('');
      } else {
        // plus button toggles closed when bars are set so we want to avoid clearing selection, otherwise bars don't render.
        this.context.readerContext.clearSelection();
      }
    }

    if (activeBar !== NoteButtonID) {
      this.context.readerContext.removeUIState(['activeBar']);
    }
  }


  render() {
    let shouldShow = !this.context.readerContext.getUIState(this, ['showReactionBar']);
    const isOpen = this.context.readerContext.getUIState(this, ['plusButtonOpen'], 1);
    const alpha = shouldShow ? this.context.readerContext.getUIAlpha(this) : 0;
    const subButtons: JSX.Element[] = [];
    let shareButton: JSX.Element | undefined;
    let total = 2;

    if (isOpen) {
      this.context.readerContext.postLayout(() => {
        this.context.readerContext.navTo && this.context.readerContext.navTo(
          {
            type: 'selection',
          },
          'bottom',
          false,
          'nav.scrollToSelection',
        );
      });
    }

    if (this.state.shareSupported) {
      total = 3;
      shareButton =
        <SubButton
          key='share'
          showing={isOpen}
          onClick={this.onClickShare}
          icon='icons/icon_reader_createquote.svg'
          idx={2}
          total={total}
          label='create'
          color='#42bcb6'
        />;
    }
    subButtons.push(
      <SubButton
        key='reaction'
        testid='reaction'
        showing={isOpen}
        onClick={this.onClickReaction}
        icon='icons/icon_reader_emoji.svg'
        idx={0}
        total={total}
        label='react'
        color='#e50583'
      />,
      <SubButton
        key='comment'
        testid='comment'
        showing={isOpen}
        icon='icons/icon_reader_feedback_note_v2.svg'
        onClick={this.onClickComment}
        idx={1}
        total={total}
        label='comment'
        color='#ea9518'
      />,
    );
    if (shareButton) {
      subButtons.push(shareButton);
    }
    const groupID = this.context.readerContext.getGroupID();
    const color = UserColors.getUserColor(this, groupID, DB.getAccountID());
    const iconSz = Math.round(BIG_RADIUS * 0.9);

    const botOffset = LAYOUT_CONSTANTS.PLUS_BUTTON_BOT_OFFSET;

    const darkStyle: boolean = this.context.readerContext.getReaderSettingsData(this, ['color']) === Constants.READER_COLOR.DARK;
    const gradient: string = darkStyle ?
    'linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.5) 75%, rgba(0, 0, 0, 0.70) 100%)' :
    'linear-gradient(rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.8) 70%, rgba(255, 255, 255, 0.95) 100%)';

    const style: React.CSSProperties = {
      backgroundImage: gradient,
    };

    return (
      <Flex.Col
        classes={`pos-a right-15 bot-${botOffset} bxshdw-2-2-3-5-rgba[0,0,0,0.2] br-${BIG_RADIUS} trans-o-0.2s ${shouldShow ? '' : 'ptrevt-n'}`}
        style={{ opacity: alpha }}>
        {
          isOpen ?
          <div classes={'pos-f fullSize ptrevt-n'} style={style}/> :
          null
        }
        {subButtons}
        <Flex.Col testid='plus' classes={`pos-r c-#4a4a4a-bg ${circle(BIG_RADIUS)} cc`} onClick={this.toggleOpen}>
          <SvgIcon
            classes={`c-${color.inlineBase}-f w-${iconSz} h-${iconSz} trans-tr-f-0.3s ${isOpen ? 'tr-45' : ''}`}
            svgName='icons/icon_plus_28x28.svg'
          />
        </Flex.Col>
      </Flex.Col>
    );
  }
}
