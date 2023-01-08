/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { FONT_TABLE } from 'clientjs/components/CanvasReader/ReaderStyle';
import { DevPanel as ReactDevPanel } from 'clientjs/components/DevPanel';
import { FPSGraph as ReactFPSGraph } from 'clientjs/components/FPSGraph';
import { MoriLogoHeader } from 'clientjs/components/moriLogoHeader.tsx';
import { Alerts } from 'clientjs/components/ReaderApp/Alerts';
import { AuthorSuggestionComponent } from 'clientjs/components/ReaderApp/AuthorSuggestion';
import { Feed } from 'clientjs/components/ReaderApp/Feed.tsx';
import { MobileWriterHome } from 'clientjs/components/ReaderApp/MobileWriterHome.tsx';
import { NavOverlay } from 'clientjs/components/ReaderApp/NavOverlay.tsx';
import { ReactionGroupMembers } from 'clientjs/components/ReaderApp/ReactionGroupMembers.tsx';
import { SkuCollection } from 'clientjs/components/ReaderApp/SkuCollection.tsx';
import { SkuLink } from 'clientjs/components/ReaderApp/SkuLink.tsx';
import { AccountButton } from 'clientjs/components/ReaderUI/AccountButton';
import { AddContact } from 'clientjs/components/ReaderUI/AddContact';
import { ContactRequestList } from 'clientjs/components/ReaderUI/ContactRequestList';
import { FlyoutIcon } from 'clientjs/components/ReaderUI/FlyoutIcon.tsx';
import { OnboardButton } from 'clientjs/components/ReaderUI/OnboardButton';
import { OnboardTextEntry } from 'clientjs/components/ReaderUI/OnboardTextEntry';
import { ReaderLoadingIndicator } from 'clientjs/components/ReaderUI/ReaderLoadingIndicator.tsx';
import { SearchField } from 'clientjs/components/ReaderUI/SearchField';
import { Terminator } from 'clientjs/components/ReaderUI/Terminator';
import * as User from 'clientjs/components/ReaderUI/User.tsx';
import * as StyledQuote from 'clientjs/components/StyledQuote';
import * as WriterBeeper from 'clientjs/components/WriterUI/Beeper.tsx';
import * as Util from 'overlib/client/clientUtil';
import { CanvasLayoutRenderer } from 'overlib/client/components/Layout/CanvasLayoutRenderer';
import * as LayoutDrawable from 'overlib/client/components/Layout/LayoutDrawable';
import { SubmitCode } from 'overlib/client/components/SubmitCode';
import { SvgIcon } from 'overlib/client/components/SvgIcon.tsx';
import * as UnstyledSwitchToggle from 'overlib/client/components/UnstyledSwitchToggle.jsx';
import { Component, ComponentMap, PROP_TYPE, registerComponentMap } from 'overlib/client/template/Component';
import * as React from 'react';

class AccButton extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
      bgColor: PROP_TYPE.COLOR,
      borderColor: PROP_TYPE.COLOR,
      disabled: PROP_TYPE.BOOL,
      fgColor: PROP_TYPE.COLOR,
      onClick: PROP_TYPE.FUNCTION,
    }, true, true);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    let newContent = Component.parseString(content, context);
    this.process(props, children, newContent, context);
    if (props.onClick) {
      props.command = props.onClick;
      delete props.onClick;
    }
    return React.createElement(AccountButton, props, newContent);
  }
}

class LogoHeader extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
      fgColor: PROP_TYPE.COLOR,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(MoriLogoHeader, props, content);
  }
}

class OnbButton extends Component {
  constructor() {
    super({
      bgColor: PROP_TYPE.COLOR,
      borderColor: PROP_TYPE.COLOR,
      classes: PROP_TYPE.CLASSES,
      colorOverride: PROP_TYPE.COLOR,
      disabled: PROP_TYPE.BOOL,
      fgColor: PROP_TYPE.COLOR,
      id: PROP_TYPE.STRING,
      onClick: PROP_TYPE.FUNCTION,
      inverseColors: PROP_TYPE.BOOL,
      ref: PROP_TYPE.STRING,
      testid: PROP_TYPE.STRING,
    }, true, true);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    let newContent = Component.parseString(content, context);
    this.process(props, children, newContent, context);
    if (props.onClick) {
      props.command = props.onClick;
      delete props.onClick;
    }
    if (children && children.length > 0) {
      return React.createElement(OnboardButton, props, children);
    } else {
      return React.createElement(OnboardButton, props, newContent);
    }
  }
}

class SubmitCodeEntry extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
      error: PROP_TYPE.STRING,
      onSubmitCB: PROP_TYPE.FUNCTION,
      placeholderText: PROP_TYPE.STRING,
      postChangeCB: PROP_TYPE.FUNCTION,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(SubmitCode, props as any, content);
  }
}

class OnbTextEntry extends Component {
  constructor() {
    super({
      id: PROP_TYPE.STRING,
      allowNewlines: PROP_TYPE.BOOL,
      classes: PROP_TYPE.CLASSES,
      className: PROP_TYPE.STRING,
      filter: PROP_TYPE.STRING,
      invalid: PROP_TYPE.BOOL,
      invalidMessage: PROP_TYPE.STRING,
      onBlurCB: PROP_TYPE.FUNCTION,
      onFocusCB: PROP_TYPE.FUNCTION,
      onPasteCB: PROP_TYPE.FUNCTION,
      onTyping: PROP_TYPE.FUNCTION,
      pattern: PROP_TYPE.STRING,
      placeholder: PROP_TYPE.STRING,
      postChange: PROP_TYPE.FUNCTION,
      setFocus: PROP_TYPE.BOOL,
      submitCB: PROP_TYPE.FUNCTION,
      type: PROP_TYPE.STRING,
      value: PROP_TYPE.STRING,
      useInvalidStyle: PROP_TYPE.BOOL,
      min: PROP_TYPE.STRING,
      max: PROP_TYPE.STRING,
      font: PROP_TYPE.FONT,
      autoCapitalize: PROP_TYPE.STRING,
      autoComplete: PROP_TYPE.STRING,
      autoCorrect: PROP_TYPE.STRING,
    }, false, false);
  }

  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    let newContent = Component.parseString(content, context);
    this.process(props, children, newContent, context);
    return React.createElement(OnboardTextEntry, props, newContent);
  }
}

class SearchFieldComponent extends Component {
  constructor() {
    super({
      id: PROP_TYPE.STRING,
      allowNewlines: PROP_TYPE.BOOL,
      classes: PROP_TYPE.CLASSES,
      textEntryClasses: PROP_TYPE.CLASSES,
      className: PROP_TYPE.STRING,
      filter: PROP_TYPE.STRING,
      invalid: PROP_TYPE.BOOL,
      invalidMessage: PROP_TYPE.STRING,
      onBlurCB: PROP_TYPE.FUNCTION,
      onFocusCB: PROP_TYPE.FUNCTION,
      onPasteCB: PROP_TYPE.FUNCTION,
      onTyping: PROP_TYPE.FUNCTION,
      pattern: PROP_TYPE.STRING,
      placeholder: PROP_TYPE.STRING,
      postChange: PROP_TYPE.FUNCTION,
      setFocus: PROP_TYPE.BOOL,
      submitCB: PROP_TYPE.FUNCTION,
      type: PROP_TYPE.STRING,
      value: PROP_TYPE.STRING,
      useInvalidStyle: PROP_TYPE.BOOL,
      min: PROP_TYPE.STRING,
      max: PROP_TYPE.STRING,
      font: PROP_TYPE.FONT,
      autoCapitalize: PROP_TYPE.STRING,
      autoComplete: PROP_TYPE.STRING,
      autoCorrect: PROP_TYPE.STRING,
      focusBlurCB: PROP_TYPE.FUNCTION,
    }, false, false);
  }

  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    let newContent = Component.parseString(content, context);
    this.process(props, children, newContent, context);
    return React.createElement(SearchField, props, newContent);
  }
}

class MobileWriterHomeComponent extends Component {
  constructor() {
    super({
      searchText: PROP_TYPE.STRING,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    let newContent = Component.parseString(content, context);
    this.process(props, children, newContent, context);
    return React.createElement(MobileWriterHome, props, newContent);
  }
}

class Icon extends Component {
  constructor() {
    super({
      id: PROP_TYPE.ICON,
      classes: PROP_TYPE.CLASSES,
      onClick: PROP_TYPE.FUNCTION,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    if (!props.id) {
      throw new Error('Icon missing id prop');
    }
    props.svgName = props.id;
    delete props.id;
    return React.createElement(SvgIcon, props);
  }
}
class Flyout extends Component {
  constructor() {
    super({
      iconID: PROP_TYPE.ICON,
      iconClasses: PROP_TYPE.CLASSES,
      classes: PROP_TYPE.CLASSES,
      arrowX: PROP_TYPE.NUMBER,
      arrowY: PROP_TYPE.NUMBER,
      arrowSize: PROP_TYPE.NUMBER,
      position: PROP_TYPE.FLYOUT_POSITION,
      startOpen: PROP_TYPE.BOOL,
      noClick: PROP_TYPE.BOOL,
    }, true, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(FlyoutIcon, props, children);
  }
}


class DevPanel extends Component {
  constructor() {
    super({
      buttonClasses: PROP_TYPE.CLASSES,
      buttonSize: PROP_TYPE.INT,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(ReactDevPanel, props as any);
  }
}

class FPSGraph extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
      forceShow: PROP_TYPE.BOOL,
    }, false, false);
  }

  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(ReactFPSGraph, props);
  }
}

class Beeper extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
      count: PROP_TYPE.INT,
      size: PROP_TYPE.INT,
    }, false, false);
  }

  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    props.size = props.size || 18; // default reader size
    props.classes = Util.combineClasses('c-readerAppCtaText-bg c-black-fg fw-100', props.classes);
    props.font = 'Montserrat';
    return React.createElement(WriterBeeper.Beeper, props as any);
  }
}

class SwitchToggleComponent extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
      disabled: PROP_TYPE.BOOL,
      handleClick: PROP_TYPE.FUNCTION,
      value: PROP_TYPE.BOOL,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    // Not exposing these... can expose later if we want to.
    props.baseClasses = 'bxshdw-0-0-1px-0-black pos-r br-15 h-4 w-40 p-6 fs-11pt c-white-bg set:(c-charcoal-bg)';
    props.baseSwitchClasses = 'bxshdw-0-0-3px-0-black pos-a br-50 w-18 h-18 top--3 ' +
      'trans-l-.15s left-0 c-white-bg set:(left-22 uiColorWhiteBG) disabled:(op-0.5)';
    props.textClasses = 'c-ash-f c-ash-fg set:(uiColorWhite) disabled:(op-0.5) fg-1 ai-c jc-fs us-n';
    return React.createElement(UnstyledSwitchToggle, props, content);
  }
}

class FeedComponent extends Component {
  constructor() {
    super({
      distributionID: PROP_TYPE.STRING,
      reactionGroupID: PROP_TYPE.STRING,
      classes: PROP_TYPE.CLASSES,
      feedType: PROP_TYPE.STRING,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(Feed, props);
  }
}

class ReactionGroupMembersComponent extends Component {
  constructor() {
    super({
      bookID: PROP_TYPE.STRING,
      classes: PROP_TYPE.CLASSES,
      groupID: PROP_TYPE.STRING,
      visibleMembers: PROP_TYPE.OBJECT,
      closeCB: PROP_TYPE.FUNCTION,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(ReactionGroupMembers, props, content);
  }
}

class Spinner extends Component {
  constructor() {
    super({
      when: PROP_TYPE.BOOL,
      classes: PROP_TYPE.CLASSES,
      light: PROP_TYPE.BOOL,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    if (props.hasOwnProperty('when') && !props.when) {
      return null;
    }
    delete props.when;
    return React.createElement(ReaderLoadingIndicator, props, content);
  }
}

class UserFace extends Component {
  constructor() {
    super({
      accountID: PROP_TYPE.STRING,
      classes: PROP_TYPE.CLASSES,
      colorSet: PROP_TYPE.INT,
      noColor: PROP_TYPE.BOOL,
      size: PROP_TYPE.INT,
      mayBeUnknown: PROP_TYPE.BOOL,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(User.Face, props, content);
  }
}

class UserName extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.CLASSES,
      accountID: PROP_TYPE.STRING,
      size: PROP_TYPE.INT,
      mayBeUnknown: PROP_TYPE.BOOL,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(User.FullName, props, content);
  }
}

class SkuLinkComponent extends Component {
  constructor() {
    super({
      skuPath: PROP_TYPE.OBJECT,
      size: PROP_TYPE.NUMBER,
      single: PROP_TYPE.BOOL,
    }, false, false);
  }

  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);

    if (!props.skuPath) {
      throw new Error('SkuLink requires skuPath');
    }
    return React.createElement(SkuLink, props, content);
  }
}

class SkuCollectionComponent extends Component {
  constructor() {
    super({
      skus: PROP_TYPE.OBJECT,
      size: PROP_TYPE.NUMBER,
      gap: PROP_TYPE.NUMBER,
      noAuthor: PROP_TYPE.BOOL,
    }, false, false);
  }

  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    if (!props.skus)  {
      throw new Error('SkuCollection requires skus');
    }
    return React.createElement(SkuCollection, props, content);
  }
}

class StyledQuote_ extends React.Component<StyledQuote.Props & {classes?: string}, {fontsReady: boolean}> {
  state = { fontsReady: false };

  componentWillMount() {
    LayoutDrawable.setFontTable(FONT_TABLE, (_font) => {
      this.setState({fontsReady: true});
    });
  }

  render() {
    if (!this.state.fontsReady) {
      return null;
    } else {
      const height = this.props.width / StyledQuote.ASPECT_RATIO;
      const props = {quote: this.props.quote, width: this.props.width};

      return React.createElement(
        CanvasLayoutRenderer,
        {classes: Util.combineClasses(`w-${this.props.width} h-${height}`, this.props.classes)},
        React.createElement(StyledQuote.StyledQuote, props),
      );
    }
  }
}

class StyledQuoteComponent extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.STRING,
      quote: PROP_TYPE.OBJECT,
      width: PROP_TYPE.NUMBER,
    }, false, false);
  }

  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(StyledQuote_, props as StyledQuote.Props, content);
  }
}

class TerminatorComponent extends Component {
  constructor() {
    super({
      classes: PROP_TYPE.STRING,
    }, false, false);
  }

  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(Terminator, props, content);
  }
}

const readerMap = new ComponentMap({
  AccountButton: new AccButton(),
  AddContact: new AddContact(),
  Alerts: new Alerts(),
  AuthorSuggestion: new AuthorSuggestionComponent(),
  Beeper: new Beeper(),
  ContactRequestList: new ContactRequestList(),
  DevPanel: new DevPanel(),
  Feed: new FeedComponent(),
  Flyout: new Flyout(),
  FPSGraph: new FPSGraph(),
  Icon: new Icon(),
  MoriLogoHeader: new LogoHeader(),
  NavOverlay: new NavOverlay(),
  OnboardButton: new OnbButton(),
  OnboardTextEntry: new OnbTextEntry(),
  SearchField: new SearchFieldComponent(),
  MobileWriterHome: new MobileWriterHomeComponent(),
  ReactionGroupMembers: new ReactionGroupMembersComponent(),
  SkuCollection: new SkuCollectionComponent(),
  SkuLink: new SkuLinkComponent(),
  Spinner: new Spinner(),
  StyledQuote: new StyledQuoteComponent(),
  SubmitCodeEntry: new SubmitCodeEntry(),
  SwitchToggle: new SwitchToggleComponent(),
  Terminator: new TerminatorComponent(),
  UserFace: new UserFace(),
  UserName: new UserName(),
});

registerComponentMap(readerMap, 5);
