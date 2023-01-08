/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher.tsx';
import * as ManuscriptInfo from 'clientjs/manuscriptInfo';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { MOBILE_WRITER_CHANNEL, ManuscriptID } from 'clientjs/shared/constants';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Navigation from 'overlib/client/navigation';
import { ComponentMap, Component, PROP_TYPE } from 'overlib/client/template/Component';
import * as DataStore from 'overlib/shared/dataStore';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as Util from 'overlib/shared/util';
import * as React from 'react';

interface ManuscriptEntryContext {
  title: string;
  descriptor: string;
  ownerID: AccountID;
  authors: AccountID[];
  pinned: boolean;
  modTime: number;
  beeperCount: number;
  onClick: () => void;
}

const MANUSCRIPTS_MASK = Util.objectMakeImmutable({
  _ids: {
    docState: 1,
  },
});

class ManuscriptEntry extends DataWatcher<{manuscriptInfo: ManuscriptInfo.ManuscriptInfo}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    title: Types.STRING,
    descriptor: Types.STRING,
    ownerID: Types.ACCOUNTIDSTR,
    pinned: Types.BOOL,
    modTime: Types.TIME,
    beeperCount: Types.INT,
    onClick: Types.FUNCTION,
  };

  private onClick = () => {
    if (this.props.manuscriptInfo.draftToOpen) {
      Navigation.go(ReaderRoutes.content1(Constants.makeBookID(MOBILE_WRITER_CHANNEL, this.props.manuscriptInfo.draftToOpen)));
    }
  }

  render() {
    const context: ManuscriptEntryContext = {
      title: this.props.manuscriptInfo.title,
      descriptor: this.props.manuscriptInfo.descriptor,
      ownerID: this.props.manuscriptInfo.ownerID,
      authors: this.props.manuscriptInfo.authors,
      pinned: this.props.manuscriptInfo.pinned,
      modTime: this.props.manuscriptInfo.modTime,
      beeperCount: this.props.manuscriptInfo.beeperCount,
      onClick: this.onClick,
    };
    return (
      <FixedTemplate template='ManuscriptEntry' context={context} />
    );
  }
}

registerContextSchema(module, 'ManuscriptEntry', ManuscriptEntry.contextSchema);

class ManuscriptEntryComponent extends Component {
  constructor() {
    super({
      manuscriptInfo: PROP_TYPE.OBJECT,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(ManuscriptEntry, props, content);
  }
}

interface MobileWriterHomeContext {
  manuscripts: ManuscriptInfo.ManuscriptInfo[];
}

export class MobileWriterHome extends InstrumentedDataWatcher<{searchText: string}, {}> {
  static noTransition = true;

  static contextSchema: StashOf<Types.Schema> = {
    manuscripts: ObjSchema.ARRAY_OF(ManuscriptInfo.ManuscriptInfoSchema),
  };
  static customComponents = new ComponentMap({
    ManuscriptEntry: new ManuscriptEntryComponent(),
  });

  private filterManuscriptInfo = (terms: string[], manuscriptInfo: ManuscriptInfo.ManuscriptInfo): boolean => {
    const title = manuscriptInfo.title.toLowerCase();
    const ownerName = manuscriptInfo.ownerName.toLowerCase();
    const descriptor = manuscriptInfo.descriptor.toLocaleLowerCase();
    for (const term of terms) {
      if (title.indexOf(term) >= 0) {
        continue;
      }
      if (ownerName.indexOf(term) >= 0) {
        continue;
      }
      if (descriptor.indexOf(term) >= 0) {
        continue;
      }
      return true; // filter it out
    }
    return false; // passes all the terms
  }

  render() {
    const context: MobileWriterHomeContext = {manuscripts: [] as ManuscriptInfo.ManuscriptInfo[]};

    const manuscripts = DataStore.getData(null, ['manuscripts'], MANUSCRIPTS_MASK);
    const manuscriptIdsToOmit = ManuscriptInfo.getCmsManagedManuscriptIDs(null);

    const searchText = this.props.searchText.trim().toLowerCase();
    const searchTerms: string[] | null = searchText ? searchText.split(/\s+/) : null;


    for (const manuscriptID in manuscripts) {
      if (manuscripts[manuscriptID].docState !== Constants.DRAFT_DOCSTATE.DEFAULT) {
        continue;
      }
      if (manuscriptIdsToOmit[manuscriptID]) {
        continue;
      }
      const manuscriptInfo = ManuscriptInfo.getManuscriptInfo(this, manuscriptID as ManuscriptID);
      if (!manuscriptInfo.draftToOpen) {
        continue;
      }
      if (searchTerms && this.filterManuscriptInfo(searchTerms, manuscriptInfo)) {
        continue;
      }
      context.manuscripts.push(manuscriptInfo);
    }
    context.manuscripts.sort(ManuscriptInfo.cmpManuscriptInfos.bind(null, false));

    return (
      <FixedTemplate template='MobileWriterHome' testid='MobileWriterHome' context={context} />
    );
  }
}

registerContextSchema(module, 'MobileWriterHome', MobileWriterHome.contextSchema, undefined, MobileWriterHome.customComponents);
