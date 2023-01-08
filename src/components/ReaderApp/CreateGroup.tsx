/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { registerContextSchema, FixedTemplate } from 'clientjs/components/FixedTemplate';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import { BookID, splitBookID, CONTENT_TYPE, TEST_FUNC } from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as DataStore from 'overlib/shared/dataStore';
import { WatcherOpt } from 'overlib/shared/dataStore';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface Props {
}

interface State {
}

const DIST_MASK = Util.objectMakeImmutable({
  title: 1,
  authorPersona: 1,
  coverImageURL: 1,
  contentType: 1,
});

const LIBRARY_MASK = Util.objectMakeImmutable({
  _ids: {
    content: {
      _ids: {
        preview: 1,
      },
    },
  },
});

export function hasGroupReads(watcher: WatcherOpt): boolean {
  const library = DataStore.getData(watcher, ['library'], LIBRARY_MASK);
  for (const _distributionID in library) {
    const distributionID = _distributionID as Constants.DistributionID;
    const content = library[distributionID].content;
    for (const _itemID in content) {
      const itemID = _itemID as Constants.ContentItemID;
      const exists = DataStore.getData(watcher, ['distributions', distributionID, 'items', itemID], 1);
      if (!exists || content[itemID].preview) { continue; }
      // Found at least one good book
      return true;
    }
  }
  return false;
}

export class CreateGroup extends DataWatcher<Props, State> {
  onClick = (bookID: BookID) => {
    let [distID] = splitBookID(bookID);
    const reactionGroupID = Sketch.runAction('reactionGroup2.create', distID, bookID);
    Navigation.go(ReaderRoutes.group2(reactionGroupID, bookID));
  }

  render() {
    const context: Context = {
      goBack: () => Navigation.goBack(),
      booksImReading: [],
      bookWipsImReading: [],
    };

    // grab all currently reading books
    const library = this.getData(['library'], LIBRARY_MASK);
    for (const _distributionID in library) {
      const distributionID = _distributionID as Constants.DistributionID;
      const content = library[distributionID].content;
      for (const _itemID in content) {
        const itemID = _itemID as Constants.ContentItemID;
        const bookID = Constants.makeBookID(distributionID, itemID);
        const exists = this.getData(['distributions', distributionID, 'items', itemID], 1);
        if (!exists || content[itemID].preview) { continue; }

        const personaID = this.getData(['distributions', distributionID, 'metaData', 'personaID']);
        const author = this.getData(['persona', personaID, 'name']);
        const itemData = this.getData(['distributions', distributionID, 'items', itemID], DIST_MASK);

        if (!itemData) {
          Log.warn('@unassigned', 'CreateGroup.badBookID', bookID);
          continue;
        }

        const list = itemData.contentType === CONTENT_TYPE.WORKSHOP
          ? context.bookWipsImReading
          : context.booksImReading
        ;

        list.push({
          title: itemData.title || 'no title',
          author,
          imageURL: itemData.coverImageURL,
          onClick: this.onClick.bind(null, bookID),
        });
      }
    }

    return (
      <FixedTemplate template='CreateGroup' testid='CreateGroup' context={context} />
    );
  }
}

interface BookImReading {
  title: string;
  author: string;
  imageURL: string;
  onClick: () => void;
}

interface Context {
  goBack: () => void;
  booksImReading: BookImReading[];
  bookWipsImReading: BookImReading[];
}

const CONTEXT_SCHEMA = {
  goBack: Types.FUNCTION,
  booksImReading: ObjSchema.ARRAY_OF({
    title: Types.STRING,
    author: Types.STRING,
    imageURL: Types.STRING_NULLABLE,
    onClick: Types.FUNCTION,
  }),
  bookWipsImReading: ObjSchema.ARRAY_OF({
    title: Types.STRING,
    author: Types.STRING,
    imageURL: Types.STRING_NULLABLE,
    onClick: Types.FUNCTION,
  }),
};

const SAMPLE_CONTEXT = {
  goBack: TEST_FUNC,
  booksImReading: [
    {
      title: 'Gone with the Wind',
      author: 'Writer McWriteface',
      imageURL: '',
      onClick: TEST_FUNC,
    },
    {
      title: 'Gone with the Wind',
      author: 'Writer McWriteface',
      imageURL: '',
      onClick: TEST_FUNC,
    },
    {
      title: 'Gone with the Wind',
      author: 'Writer McWriteface',
      imageURL: '',
      onClick: TEST_FUNC,
    },
  ],
  bookWipsImReading: [
    {
      title: 'Never Gonna Finish You Up',
      author: 'Rick Astley',
      imageURL: '',
      onClick: TEST_FUNC,
    },
    {
      title: 'Never Gonna Let You Down',
      author: 'Rick Astley',
      imageURL: '',
      onClick: TEST_FUNC,
    },
    {
      title: 'Never Gonna Run Around',
      author: 'Rick Astley',
      imageURL: '',
      onClick: TEST_FUNC,
    },
  ],
};

registerContextSchema(module, 'CreateGroup', CONTEXT_SCHEMA, SAMPLE_CONTEXT);
