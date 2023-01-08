/**
* Copyright 2014-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { LAYOUT_CONSTANTS } from 'clientjs/components/CanvasReader/ReaderStyle';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { Button } from 'clientjs/components/UI/Button';
import * as Radio from 'clientjs/components/UI/Radio.tsx';
import { SwitchToggle } from 'clientjs/components/UI/SwitchToggle';
import * as DB from 'clientjs/db';
import * as Constants from 'clientjs/shared/constants';
import { ReactionStyle } from 'clientjs/shared/reactionGroupDB';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as Navigation from 'overlib/client/navigation';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as DataStore from 'overlib/shared/dataStore';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const gFontSizes = [ // TODO you have to be fucking kidding me
  'tiny',
  'small',
  'medium',
  'large',
  'xl',
  'xxl',
  'xxxl',
  'xxxxl',
  'xxxxxl',
  'xxxxxxl',
];

const VR_SETTINGS_MASK = Util.objectMakeImmutable({
  _ids: {
    viewedFTE: 1,
    limitScrolling: 1,
    verticalScrollArea: 1,
    showPerfGraph: 1,
    fontSize: 1,
    setReaderColor: 1,
    tapPageZonesDisabled: 1,
    oneHandTapZones: 1,
    showedTutorial: 1,
  },
});

interface ReaderSettingsContext {
  showAdminSettings: boolean;
  toggleAdvancedSettings: () => void;
  fontSizeDown: () => void;
  fontSizeUp: () => void;
  fontSizeUpDisabled: boolean;
  fontSizeDownDisabled: boolean;
  setWhite: () => void;
  setBlack: () => void;
  isItBlack: boolean;
  topBarHeight: number;
}

export class ReaderSettings extends DataWatcher<{}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    showAdminSettings: Types.BOOL,
    toggleAdvancedSettings: Types.FUNCTION,
    fontSizeDown: Types.FUNCTION,
    fontSizeUp: Types.FUNCTION,
    fontSizeUpDisabled: Types.BOOL,
    fontSizeDownDisabled: Types.BOOL,
    setWhite: Types.FUNCTION,
    setBlack: Types.FUNCTION,
    isItBlack: Types.BOOL,
    topBarHeight: Types.NUMBER,
  };

  static sampleContext: Stash = {
    showAdminSettings: false,
    toggleAdvancedSettings: TEST_FUNC,
    fontSizeDown: TEST_FUNC,
    fontSizeUp: TEST_FUNC,
    fontSizeUpDisabled: true,
    fontSizeDownDisabled: true,
    setWhite: TEST_FUNC,
    setBlack: TEST_FUNC,
    isItBlack: false,
    topBarHeight: LAYOUT_CONSTANTS.TOP_BAR_HEIGHT,
  };

  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });
  context: ProviderContext;


  setVerticalScrollArea = (arg) => {
    DB.vrSettingsSetVerticalScrollArea(arg);
  }

  setLimitScrolling = (arg) => {
    DB.vrSettingsSetLimitScrolling(arg);
  }

  fontSizeChange = (up: boolean) => {
    let curIdx;
    const settings = this.getData(['vrsettings'], VR_SETTINGS_MASK);

    if (settings) {
      curIdx = gFontSizes.indexOf(settings.fontSize);
      if (curIdx === -1) {
        curIdx = 1;
      }
    } else {
      curIdx = 1;
    }
    if (up) {
      if (curIdx < gFontSizes.length - 1) {
        curIdx++;
      }
    } else {
      if (curIdx > 0) {
        curIdx--;
      }
    }

    this.context.readerContext.recordMetric('font.setSize', {size: gFontSizes[curIdx]});
    this.setFontSize(gFontSizes[curIdx]);
  }

  setFontSize = (arg) => {
    this.context.readerContext.recordMetric('font.setSize', {size: arg});
    DB.vrSettingsSetFontSize(arg);
  }

  removeAllMarks = () => {
    Sketch.runAction('reactionGroup2.deleteAllFeedback', this.context.readerContext.getGroupID(), this.context.readerContext.getBookID());
  }

  resetReadingProgress = () => {
    const bookID = this.context.readerContext.getBookID();
    DB.vrDataSetPosition(bookID, 'current', '', 0, 0, 0);
    DB.vrDataSetPosition(bookID, 'max', '', 0, 0, 0);
    DB.vrDataSetPosition(bookID, 'maxSeen', '', 0, 0, 0);
  }

  setReaderColor = (readerColor: Constants.ReaderColor) => {
    Sketch.runAction('readerSettings.setColor', readerColor);
    this.context.readerContext.recordMetric('color.set', {readerColor});
  }

  toggleAdvancedSettings = () => {
    this.context.readerContext.replaceUIState(['showAdvancedSettings'], !this.context.readerContext.getUIState(null, ['showAdvancedSettings']));
  }

  forceIsBook = (val) => {
    DataStore.updateData(['localSettings', 'forceIsBook'], val);
  }

  setReactionStyle = (val) => {
    let style: ReactionStyle | null;
    if (val) {
      style = 'sentiment';
    } else {
      style = null;
    }
    Sketch.runAction('reactionGroup2.setReactionStyle', this.context.readerContext.getGroupID(), style);
  }

  toggleShareButton = () => {
    const oldValue = this.context.readerContext.getUIState(null, ['showShareButton']);
    this.context.readerContext.replaceUIState(['showShareButton'], !oldValue);
  }

  renderAdvancedPanel = () => {
    const buttonClasses = 'p-y-4 p-x-10 fs-80%';
    const settings = this.getData(['vrsettings'], VR_SETTINGS_MASK);
    const reactionStyle = false; // for now
    return (
      <Flex.Col classes='ptrevt-a p-10 p-x-30 c-white-bg c-black-fg fg-1'>
        <div>
          <Flex.Row classes='ai-b jc-sb'>
            <Button classes={buttonClasses} command={this.toggleAdvancedSettings}>Hide Admin Settings</Button>
            <Button classes={buttonClasses} command={Navigation.hardPageRefresh}>refresh</Button>
          </Flex.Row>
          <Flex.Row classes='ai-b jc-sb'>
            <Flex.Col classes='uiFontSmall uiFontSemiBold uiColorDarkGray'>show perf graph</Flex.Col>
            <Radio.Group
              selectedValue={settings.showPerfGraph}
              classes='p-l-15'
              buttonClasses='uiFontTiny'
              handleClick={DB.vrSettingsSetShowPerfGraph}
            >
              <Radio.Button key={'yes'} value={true}>{'yes'}</Radio.Button>
              <Radio.Button key={'no'} value={false}>{'no'}</Radio.Button>
            </Radio.Group>
          </Flex.Row>
          <Flex.Row classes='ai-b jc-sb'>
            <Flex.Col classes='uiFontSmall uiFontSemiBold uiColorDarkGray'>reaction style</Flex.Col>
            <Radio.Group
              selectedValue={reactionStyle}
              classes='p-l-15'
              buttonClasses='uiFontTiny'
              handleClick={this.setReactionStyle}
            >
              <Radio.Button key={'old'} value={false}>{'old'}</Radio.Button>
              <Radio.Button key={'sentiment'} value={true}>{'sentiment'}</Radio.Button>
            </Radio.Group>
          </Flex.Row>
          <Flex.Row classes='ai-c'>
            <Flex.Col classes='uiFontSmall uiFontSemiBold uiColorDarkGray'>share button</Flex.Col>
            <Flex.Col classes='fg-1' />
            <SwitchToggle
              value={!!this.context.readerContext.getUIState(this, ['showShareButton'])}
              handleClick={this.toggleShareButton}
              />
            <Flex.Col classes='fg-1' />
          </Flex.Row>
          <Flex.Row classes='ai-b jc-sb'>
            <Button classes={buttonClasses} command={this.resetReadingProgress}>reset reading progress</Button>
            <Button classes={buttonClasses} command={this.removeAllMarks}>clear all feedback</Button>
          </Flex.Row>
        </div>
      </Flex.Col>
    );
  }

  closeCB = () => {
    this.context.readerContext.setSettings(false);
  }

  render() {
    const settings = this.getData(['vrsettings'], VR_SETTINGS_MASK);
    const readerColor = this.getData(['settingsGlobal', 'reader', 'color'], 1);

    const showSettings = this.context.readerContext.getUIState(this, ['showSettings']);
    const showAdvanced = this.context.readerContext.getUIState(this, ['showAdvancedSettings']);

    const advancedPanel = showSettings && showAdvanced ? (
      <div classes='c-white-bg pos-r w-100%'>
        {this.renderAdvancedPanel()}
      </div>
      ) : null;

    const curFontSize = gFontSizes.indexOf(settings.fontSize);

    const context: ReaderSettingsContext = {
      showAdminSettings: Boolean(DB.getAccessLevelUnsafe()),
      toggleAdvancedSettings: this.toggleAdvancedSettings,
      fontSizeDown: this.fontSizeChange.bind(null, false),
      fontSizeUp: this.fontSizeChange.bind(null, true),
      fontSizeDownDisabled: curFontSize < 1,
      fontSizeUpDisabled: curFontSize >= gFontSizes.length - 1,
      setWhite: this.setReaderColor.bind(null, Constants.READER_COLOR.LIGHT),
      setBlack: this.setReaderColor.bind(null, Constants.READER_COLOR.DARK),
      isItBlack: (readerColor !== Constants.READER_COLOR.LIGHT),
      topBarHeight: LAYOUT_CONSTANTS.TOP_BAR_HEIGHT,
    };

    return (
      <Flex.Col classes={`pos-r trans-tr-0.3s ${showSettings ? 'ty-0' : 'ty--220 ptrevt-n'}`}>
        <FixedTemplate template='ReaderSettings' context={context} />
        {advancedPanel}
      </Flex.Col>
    );
  }
}

registerContextSchema(module, 'ReaderSettings', ReaderSettings.contextSchema, ReaderSettings.sampleContext);
