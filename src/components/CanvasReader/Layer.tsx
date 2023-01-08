/**
* Copyright 2017-present Ampersand Technologies, Inc.
*
*/

import { AuthorQuestion } from 'clientjs/components/CanvasReader/AuthorQuestion.tsx';
import { ContentParagraph } from 'clientjs/components/CanvasReader/ContentParagraph.tsx';
import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { ImageSet } from 'clientjs/components/CanvasReader/ImageSet.tsx';
import { Entry, EntryTypes } from 'clientjs/shared/readerParse';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import { AnimationDef } from 'overlib/client/components/Layout/LayoutAnimator';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface LayerProps {
  firstEntryIdx: number;
  lastEntryIdx: number;
}

export class Layer extends DataWatcher<LayerProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  render() {
    const parsedData = this.context.readerContext.getRawParsedData();
    const children: JSX.Element[] = [];
    for (let entryIdx = this.props.firstEntryIdx; entryIdx <= this.props.lastEntryIdx; ++entryIdx) {
      const entry : Entry = parsedData.entries[entryIdx];
      switch (entry.type) {
        case EntryTypes.paragraph:
          children.push(<ContentParagraph key={entryIdx} entryIdx={entryIdx} paragraph={entry} />);
          break;
        case EntryTypes.images:
          children.push(<ImageSet key={entryIdx} entryIdx={entryIdx} />);
          break;
        case EntryTypes.authorNote:
          if (entry.answers && entry.answers.length > 0) {
            children.push(<AuthorQuestion key={entryIdx} entryIdx={entryIdx} />);
          }
          break;
      }
    }

    const anims: AnimationDef[] = [];
    anims.push({
      key: 'colorchange',
      motivator: {
        source: 'screenY',
        easingFunction: 'linear',
        start: 100,
        end: 300,
      },
      modifier: {
        field: 'backgroundColor',
        start: '30%',
        end: '100%',
      },
    });

    return (
      <div classes={`fullSize c-readerLayerBG-bg p-b-15px p-t-15px`} data-anims={anims}>
        {children}
      </div>
    );
  }
}
