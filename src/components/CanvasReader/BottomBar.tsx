/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { ReactionDesc } from 'clientjs/components/CanvasReader/RenderData';
import { NoteButtonID } from 'clientjs/components/CanvasReader/UIState';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as DB from 'clientjs/db';
import * as Color from 'color';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { SvgIcon } from 'overlib/client/components/SvgIcon.tsx';
import * as Content from 'overlib/client/content';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const ICONS_PER_ROW = 5;
const REACTION_PICKER_NORMAL_HEIGHT = 181;
const REACTION_PICKER_EXTRA_ROW_HEIGHT = 60;

export function getIconElem(isCanvas: boolean, icon: string, size: number, classes?: string): JSX.Element {
    let iconElem: JSX.Element;
    if (Util.startsWith(icon, 'icons/')) {
      if (isCanvas) {
        iconElem = <svg classes={Util.combineClasses(`w-${size} h-${size} c-white-f`, classes)} name={icon} />;
      } else {
        iconElem = <SvgIcon classes={Util.combineClasses(`w-${size} h-${size} c-white-f`, classes)} svgName={icon} />;
      }
    } else {
      const url = isCanvas ? icon : (Content.contentUrl(null, icon) || icon);
      iconElem = <img classes={Util.combineClasses(`w-${size} h-${size}`, classes)} src={url} />;
    }
    return iconElem;
}

class ReactionPickerIcon extends DataWatcher<{id: string, size: number}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  public add = () => {
    const id = this.props.id;
    const rc = this.context.readerContext;
    rc.readerReactions.toggleReactionLocal(id, 'workshop');
    rc.removeUIState(['activeBar']);
    rc.clearSelection();
  }

  render() {
    const ids = this.props.id.split(':');
    const subReaction: ReactionDesc = this.context.readerContext.getRenderData(this, ['reactions', ids[0], 'subReactions', ids[1]]);

    return (
      <Flex.Col classes={`trans-o-.2s active:(op-.5) fg-1 ai-c w-${this.props.size * (1.2)} p-x-${this.props.size * 0.2}`} onClick={this.add}>
        {getIconElem(false, subReaction.icon, this.props.size)}
        <div classes='hyp-n c-white-fg m-t-5 ' style={this.context.readerContext.getFontStyle(this, 'inlineButtonLabel')}>
          {subReaction.desc}
        </div>
      </Flex.Col>
    );
  }
}

const REACTION_PICKER_MASK = Util.objectMakeImmutable({
  icon: 1,
  desc: 1,
  subReactions: ObjSchema.MAP({
    deprecated: 1,
  }),
});

interface ReactionPickerProps {
  bar: string;
  xPos: number;
  yPos: number;
  shouldShow: boolean;
}

class ReactionPicker extends DataWatcher<ReactionPickerProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  componentWillUnmount() {
    super.componentWillUnmount();
    this.context.readerContext.replaceUIState(['reactionPickerHeight'], 0);
  }

  render() {
    const activeIcon: {icon: string, desc: string, subReactions: StashOf<ReactionDesc>} =
      this.context.readerContext.getRenderData(this, ['reactions', this.props.bar], REACTION_PICKER_MASK);

    let iconCount = 0;
    if (activeIcon.subReactions) {
      for (const subReactionID in activeIcon.subReactions) {
        if (!activeIcon.subReactions[subReactionID].deprecated) {
          ++iconCount;
        }
      }
    }
    const iconSize = iconCount > 3 ? 40 : 57;

    const subReactions: JSX.Element[] = [];
    if (activeIcon.subReactions) {
      for (const subReactionID in activeIcon.subReactions) {
        const reactionID = this.props.bar + ':' + subReactionID;
        if (activeIcon.subReactions[subReactionID].deprecated) {
          continue;
        }
        subReactions.push(
          <ReactionPickerIcon testid={reactionID} key={reactionID} id={reactionID} size={iconSize}/>,
        );
      }
    }

    const numRows = Math.ceil(iconCount / ICONS_PER_ROW);
    let subReactionRows: JSX.Element[] = [];
    for (let i = 0; i < numRows; ++i) {
      subReactionRows.push(
        <Flex.Row classes='fg-1 as-s ai-c p-x-50' key={'row-' + i}>
          {subReactions.slice(i * ICONS_PER_ROW, (i + 1) * ICONS_PER_ROW)}
        </Flex.Row>,
      );
    }

    const reactionPickerHeight: number = REACTION_PICKER_NORMAL_HEIGHT + Math.max(0, numRows - 1) * REACTION_PICKER_EXTRA_ROW_HEIGHT;
    this.context.readerContext.replaceUIState(['reactionPickerHeight'], reactionPickerHeight);


    const id = DB.getAccountID();
    const groupID = this.context.readerContext.getGroupID();
    const color = UserColors.getUserColor(this, groupID, id);
    const midColor = Color(color.trayBase).mix(Color(color.trayGrad)).hex();
    const style: React.CSSProperties = {
      backgroundImage: `linear-gradient(135deg, ${color.trayBase} 0%, ${midColor} 75%, ${color.trayGrad} 100%)`,
    };
    const xPos = this.props.xPos || 0;
    const yPos = this.props.yPos || 0;
    return (
      <Flex.Col
        classes={
          `${this.props.shouldShow ? 'ptrevt-p' : ''} pos-a bot-0 left-0 right-0 h-${reactionPickerHeight}  ai-c trans-tr-0.3s tx-${xPos} ty-${yPos}`
        }
        style={style}
      >
        {getIconElem(false, activeIcon.icon, 24, 'm-t-14 as-c')}
        <div key='tagline' classes='m-y-6 c-white-fg' style={this.context.readerContext.getFontStyle(this, 'inlineButtonTagline')}>
          {activeIcon.desc}
        </div>
        {subReactionRows}
      </Flex.Col>
    );
  }
}

interface ReactionPickerManagerProps {
  activeBar: string|null;
  shouldShow: boolean;
}

interface ReactionPickerManagerState {
  previousBar: string|null;
  activeBar: string|null;
  transFrame: boolean;
}

class ReactionPickerManager extends DataWatcher<ReactionPickerManagerProps, ReactionPickerManagerState> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  state: ReactionPickerManagerState = {
    previousBar: null,
    activeBar: null,
    transFrame: false,
  };

  endTransFrame = () => {
    this.setState({transFrame: false});
  }

  private setActiveBar(activeBar: string|null) {
    if (activeBar === this.state.activeBar) {
      return;
    }
    this.clearNamedTimeout('trans');
    this.setState({
      previousBar: this.state.activeBar,
      activeBar,
      transFrame: true,
    }, () => this.setNamedTimeout('trans', this.endTransFrame, 0));
  }

  componentWillMount() {
    super.componentWillMount();
    this.setActiveBar(this.props.activeBar);
  }

  componentWillReceiveProps(nextProps: ReactionPickerManagerProps) {
    this.setActiveBar(nextProps.activeBar);
  }

  render() {
    const bars = this.context.readerContext.getRenderData(this, ['reactions'], Util.IDS_MASK);
    let idx = 0;
    const barIdxMap: StashOf<number> = {};
    for (const bar in bars) {
      barIdxMap[bar] = idx++;
    }
    let xDiff = 0;
    if (this.state.previousBar && this.state.activeBar) {
      // transitioning between bars
      const width = this.context.readerContext.getUIState(null, ['page', 'width']);
      xDiff = Math.sign(barIdxMap[this.state.activeBar] - barIdxMap[this.state.previousBar]) * width;
    }
    let previousBar: JSX.Element | undefined;
    if (this.state.previousBar) {
      let xPos = 0;
      let yPos = 0;
      if (!this.state.transFrame) {
        if (xDiff) {
          xPos = -xDiff;
        } else {
          yPos = REACTION_PICKER_NORMAL_HEIGHT;
        }
      }
      previousBar = (
        <ReactionPicker
          key={this.state.previousBar}
          bar={this.state.previousBar}
          xPos={xPos}
          yPos={yPos}
          shouldShow={this.props.shouldShow}
        />
      );
    }
    let activeBar: JSX.Element | undefined;
    if (this.state.activeBar) {
      let xPos = 0;
      let yPos = 0;
      if (this.state.transFrame) {
        if (xDiff) {
          xPos = xDiff;
        } else {
          yPos = REACTION_PICKER_NORMAL_HEIGHT;
        }
      }
      activeBar = (
        <ReactionPicker
          key={this.state.activeBar}
          bar={this.state.activeBar}
          xPos={xPos}
          yPos={yPos}
          shouldShow={this.props.shouldShow}
        />
      );
    }
    return (
      <div classes={`pos-r h-${REACTION_PICKER_NORMAL_HEIGHT} ptrevt-n`}>
        {previousBar}
        {activeBar}
      </div>
    );
  }
}

interface BottomBarButtonProps {
  iconID: string;
  icon: string;
  selected: boolean;
  enabled: boolean;
}

class BottomBarButton extends DataWatcher<BottomBarButtonProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private toggle = () => {
    const selection = this.context.readerContext.getUIState(null, ['selection', 'entryIdx']);
    if (!selection) {
      if (!this.context.readerContext.autoSelectSentence(this.props.iconID)) {
        return true;
      }
    }
    this.context.readerContext.setActiveBar(this.props.iconID);
    return true;
  }
  render() {
    return (
      <Flex.Col
        key={this.props.iconID}
        classes={'fg-1 cc trans-bc-0.3s' + (this.props.selected ? ' c-white-bg-a0.5' : '') + (!this.props.enabled ? ' op-0.2' : '')}
        onClick={this.props.enabled ? this.toggle : undefined}
      >
        <Flex.Col classes='w-43 h-28 grad-d-#6d6e71-#414042 br-14 cc'>
          {getIconElem(false, this.props.icon, 22)}
        </Flex.Col>
      </Flex.Col>
    );
  }
}

const ROOT_REACTIONS_MASK = Util.objectMakeImmutable(ObjSchema.MAP({
  icon: 1,
  enabled: 1,
}));

export class BottomBar extends DataWatcher<{}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  componentDidMount() {
    // TODO: find way to query bottom bar height when this is templatized
    this.context.readerContext.replaceUIState(['bottomBarHeight'], LAYOUT_CONSTANTS.BOTTOM_BAR_HEIGHT);
  }

  render() {
    let shouldShow = true;
    if (this.context.readerContext.getUIState(this, ['plusButtonOpen']) ||
      this.context.readerContext.getUIState(this, ['showReactionBar']) ) {
      shouldShow = false;
    }
    const alpha = shouldShow ? this.context.readerContext.getUIAlpha(this) : 0;
    const activeBar = this.context.readerContext.getUIState(this, ['activeBar']);
    const icons: StashOf<{icon: string, enabled: boolean}> = this.context.readerContext.getRenderData(this, ['reactions'], ROOT_REACTIONS_MASK);

    const buttons: JSX.Element[] = [];

    for (const id in icons) {
      const icon = icons[id];
      const button = <BottomBarButton testid={id} key={id} iconID={id} icon={icon.icon} selected={id === activeBar} enabled={icon.enabled}/>;
      if (id === NoteButtonID) {
        continue;
      } else {
        buttons.push(button);
      }
    }

    return (
      <Flex.Col classes='ptrevt-n pos-a left-0 right-0 bot-0 trans-o-0.2s' style={{ opacity: alpha }}>
        <ReactionPickerManager activeBar={activeBar} shouldShow={shouldShow}/>
        <Flex.Row
          classes={
            `pos-r ${shouldShow ? 'ptrevt-p' : ''} h-${LAYOUT_CONSTANTS.BOTTOM_BAR_HEIGHT - LAYOUT_CONSTANTS.SAFE_AREA_BOTTOM}` +
            ` c-readerFrameBackground-bg p-x-15`
          }
        >
          {buttons}
          <div classes='w-70'/>
        </Flex.Row>
        <div classes={`pos-r h-${LAYOUT_CONSTANTS.SAFE_AREA_BOTTOM} c-#212121-bg`}/>
      </Flex.Col>
    );
  }
}
