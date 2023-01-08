/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as Content from 'overlib/client/content';
import * as Log from 'overlib/client/log';
import { Component, PROP_TYPE } from 'overlib/client/template/Component.tsx';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

export type AE = AEComment | AEInvite | AEDiscount | AEMention | AEDraftInvite | AEPromotion;

export interface AEDiscount {
  type: 'discount';
  modTime: number;
  onClick: () => void;
  seen: boolean;
  channelName: string;
  skuTitle: string;
  contentImage: string;
}

class AlertsEntryDiscount extends DataWatcher<{entry: AEDiscount}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    modTime: Types.NUMBER,
    onClick: Types.FUNCTION,
    seen: Types.BOOL,
    channelName: Types.STRING,
    skuTitle: Types.STRING,
    contentImage: Types.STRING,
  };

  render() {
    const context = Util.shallowCloneExcludeFields(this.props.entry, ['type']);

    return <FixedTemplate
      template='AlertsDiscount'
      context={context}/>;
  }
}

registerContextSchema(module, 'AlertsDiscount', AlertsEntryDiscount.contextSchema);

export interface AEInvite {
  type: 'invitation';
  modTime: number;
  onClick: () => void;
  seen: boolean;
  bookName: string;
  channelName: string;
  who: string;
  whoID: string;
}

class AlertsEntryInvite extends DataWatcher<{entry: AEInvite}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    modTime: Types.NUMBER,
    onClick: Types.FUNCTION,
    seen: Types.BOOL,
    bookName: Types.STRING,
    channelName: Types.STRING,
    who: Types.STRING,
    whoID: Types.STRING,
  };

  render() {
    const context = Util.shallowCloneExcludeFields(this.props.entry, ['type']);
    return <FixedTemplate
      template='AlertsInvite'
      context={context}
    />;
  }
}

registerContextSchema(module, 'AlertsInvite', AlertsEntryInvite.contextSchema);


export interface AEComment {
  type: 'comment';
  seen: boolean;
  count: number;
  modTime: number;
  title: string;
  groupName: string;
  who: string;
  contentImage: string;
  onClick: () => void;
}

class AlertsEntryComment extends DataWatcher<{entry: AEComment}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    modTime: Types.NUMBER,
    seen: Types.BOOL,
    count: Types.NUMBER,
    title: Types.STRING,
    groupName: Types.STRING,
    who: Types.STRING,
    contentImage: Types.STRING,
    onClick: Types.FUNCTION,
  };

  render() {
    const context = Util.shallowCloneExcludeFields(this.props.entry, ['type']);
    return <FixedTemplate
      template='AlertsComment'
      context={context}
    />;
  }
}

registerContextSchema(module, 'AlertsComment', AlertsEntryComment.contextSchema);


export interface AEMention {
  type: 'mention';
  modTime: number;
  seen: boolean;
  draftName: string;
  who: string;
  whoID: string;
  onClick: () => void;
}

export class AlertsEntryMention extends DataWatcher<{entry: AEMention}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    modTime: Types.NUMBER,
    seen: Types.BOOL,
    draftName: Types.STRING,
    who: Types.STRING,
    whoID: Types.STRING,
    onClick: Types.FUNCTION,
  };

  render() {
    const context = Util.shallowCloneExcludeFields(this.props.entry, ['type']);

    return <FixedTemplate template='AlertsEntryMention' context={context} />;
  }
}

registerContextSchema(module, 'AlertsEntryMention', AlertsEntryMention.contextSchema);


export interface AEDraftInvite {
  type: 'draftInvite';
  modTime: number;
  seen: boolean;
  draftName: string;
  who: string;
  whoID: string;
  onClick: () => void;
}

export class AlertsEntryDraftInvite extends DataWatcher<{entry: AEDraftInvite}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    modTime: Types.NUMBER,
    seen: Types.BOOL,
    draftName: Types.STRING,
    who: Types.STRING,
    whoID: Types.STRING,
    onClick: Types.FUNCTION,
  };

  render() {
    const context = Util.shallowCloneExcludeFields(this.props.entry, ['type']);

    return <FixedTemplate template='AlertsEntryDraftInvite' context={context} />;
  }
}

registerContextSchema(module, 'AlertsEntryDraftInvite', AlertsEntryDraftInvite.contextSchema);

export interface AEPromotion {
  type: 'promotion';
  contentID: string;
  modTime: number;
  seen: boolean;
  onClick: () => void;
}

export class AlertsEntryPromotion extends DataWatcher<{entry: AEPromotion}, {}> {
  render() {
    // begin Tshirt hack
    if (this.props.entry.contentID === Constants.TSHIRT_INVITATION) {
      return (
        <Flex.Row classes='p-y-9 pos-r p-x-10' onClick={this.props.entry.onClick}>
          <Flex.Col classes={'pos-a top-27 left--9 w-8 h-8 c-readerPrimary-bg br-4' + (this.props.entry.seen ? ' op-0' : '')}/>
          <Flex.Col classes='w-50 h-50 br-4 o-h c-#e8219c-bg bgs-contain bg-c bgr-n'>
            <img src={Content.contentUrl(this, 'images/BookBoss_Tank.png')}/>
          </Flex.Col>
          <div classes='c-white-fg m-l-18 m-r-30 fs-14 fg-1'>
            Invite 5 friends to Ampersand today and get a free book boss tank top!
          </div>
      </Flex.Row>
      );
    } else {
      return (
        <Flex.Row classes='p-y-9 pos-r p-x-10' onClick={this.props.entry.onClick}>
          <Flex.Col classes={'pos-a top-27 left--9 w-8 h-8 c-readerPrimary-bg br-4' + (this.props.entry.seen ? ' op-0' : '')}/>
          <Flex.Col classes='w-50 h-50 br-4 o-h c-#e8219c-bg bgs-contain bg-c bgr-n'>
            <img src={Content.contentUrl(this, 'images/BookBoss_Tank.png')}/>
          </Flex.Col>
          <div classes='c-white-fg m-l-18 m-r-30 fs-14 fg-1'>
            You won a free tank top! Click here to claim it.
          </div>
      </Flex.Row>
      );
    }
    // end Tshirt hack
  }
}



export class AlertsEntry extends Component {
  constructor() {
    super({
      entry: PROP_TYPE.OBJECT,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    switch (props.entry.type) {
      case 'invitation':
        return React.createElement(AlertsEntryInvite, props, content);
      case 'comment':
        return React.createElement(AlertsEntryComment, props, content);
      case 'discount':
        return React.createElement(AlertsEntryDiscount, props, content);
      case 'mention':
        return React.createElement(AlertsEntryMention, props, content);
      case 'draftInvite':
        return React.createElement(AlertsEntryDraftInvite, props, content);
      case 'promotion':
        return React.createElement(AlertsEntryPromotion, props, content);
    }
    Log.error('@sam', 'Unknown alerts entry type: ', props.entry.type);
    return null;
  }
}
