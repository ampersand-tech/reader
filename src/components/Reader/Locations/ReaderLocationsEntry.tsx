/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { ReaderPreviewLocationsInsert } from 'clientjs/components/CanvasReader/ReaderPreviewInsert.tsx';
import { registerContextSchema } from 'clientjs/components/FixedTemplate';
import { FixedTemplate } from 'clientjs/components/FixedTemplate.tsx';
import { TEST_FUNC } from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Log from 'overlib/client/log';
import { Component, PROP_TYPE } from 'overlib/client/template/Component.tsx';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

export type RLE = RLEToc | RLEComment | RLEPreview | RLEMyLocation;

export interface RLEToc {
  type: 'toc';
  baseCharsSoFar: number;

  text: string;
  isSection: boolean;
  onClick: () => void;
  firstPage: number;
  numPages: number;
  numReactions: number;
  scrollMarkId: string;
}

class TocEntry extends DataWatcher<{entry: RLEToc}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    text: Types.STRING,
    isSection: Types.BOOL,
    onClick: Types.FUNCTION,
    firstPage: Types.NUMBER,
    numPages: Types.NUMBER,
    numReactions: Types.NUMBER,
    scrollMarkId: Types.STRING,
  };

  static sampleContext: Stash = {
    text: 'Chapter 11 - The Test-ening',
    isSection: false,
    onClick: TEST_FUNC,
    firstPage: 55,
    numPages: 11,
    numReactions: 3,
    scrollMarkId: '',
  };
  render() {
    const context = Util.shallowCloneExcludeFields(this.props.entry, ['type', 'baseCharsSoFar']);
    return <FixedTemplate
      template='ReaderLocationsTocEntry'
      context={context}
    />;
  }
}

registerContextSchema(module, 'ReaderLocationsTocEntry', TocEntry.contextSchema, TocEntry.sampleContext);

export interface RLEComment {
  type: 'comment';
  baseCharsSoFar: number;
  modTime: number;

  text: string;
  textColor: string;
  userName: string;
  onClick: () => void;
  isBeeped: boolean;
  firstPage: number;
  numResponses: number;
  whenText: string;
  blurred: boolean;
  scrollMarkId: string;
}

class CommentEntry extends DataWatcher<{entry: RLEComment}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    text: Types.STRING,
    textColor: Types.STRING,
    userName: Types.STRING,
    onClick: Types.FUNCTION,
    isBeeped: Types.BOOL,
    firstPage: Types.NUMBER,
    numResponses: Types.NUMBER,
    whenText: Types.STRING,
    blurred: Types.BOOL,
    scrollMarkId: Types.STRING,
  };

  static sampleContext: Stash = {
    text: 'This is awesome!',
    textColor: '#FF00FF',
    userName: 'Testina',
    onClick: TEST_FUNC,
    isBeeped: true,
    firstPage: 111,
    numResponses: 3,
    whenText: 'Just now',
    blurred: false,
    scrollMarkId: '',
  };
  render() {
    const context = Util.shallowCloneExcludeFields(this.props.entry, ['type', 'baseCharsSoFar', 'modTime']);
    return <FixedTemplate
      template='ReaderLocationsCommentEntry'
      context={context}
    />;
  }
}

registerContextSchema(module, 'ReaderLocationsCommentEntry', CommentEntry.contextSchema, CommentEntry.sampleContext);

export interface RLEPreview {
  type: 'preview';
  baseCharsSoFar: number;
}

export interface RLEMyLocation {
  type: 'myLocation';
  baseCharsSoFar: number;
  firstPage: number;
  onClick: () => void;
  scrollMarkId: string;
}

class MyLocationEntry extends DataWatcher<{entry: RLEMyLocation}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    firstPage: Types.NUMBER,
    onClick: Types.FUNCTION,
    scrollMarkId: Types.STRING,
  };

  static sampleContext: Stash = {
    onClick: TEST_FUNC,
    firstPage: 55,
    scrollMarkId: '',
  };
  render() {
    const context = Util.shallowCloneExcludeFields(this.props.entry, ['type', 'baseCharsSoFar']);
    return <FixedTemplate
      template='ReaderLocationsMyLocationEntry'
      context={context}
    />;
  }
}

export class ReaderLocationsEntry extends Component {
  constructor() {
    super({
      entry: PROP_TYPE.OBJECT,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    switch (props.entry.type) {
      case 'toc':
        return React.createElement(TocEntry, props, content);
      case 'comment':
        return React.createElement(CommentEntry, props, content);
      case 'preview':
        return React.createElement(ReaderPreviewLocationsInsert, props, content);
      case 'myLocation':
        return React.createElement(MyLocationEntry, props, content);
    }
    Log.error('@sam', 'Unknown reader locations entry type: ', props.entry.type);
    return null;
  }
}

registerContextSchema(module, 'ReaderLocationsMyLocationEntry', MyLocationEntry.contextSchema, MyLocationEntry.sampleContext);
