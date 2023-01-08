/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { ImageLightbox } from 'clientjs/components/CanvasReader/ImageLightbox.tsx';
import { ScrollBar } from 'clientjs/components/CanvasReader/ScrollBar.tsx';
import * as StandardAnims from 'clientjs/components/CanvasReader/StandardAnims';
import { EntryTypes } from 'clientjs/shared/readerParse';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as DataStore from 'overlib/shared/dataStore';
import * as Types from 'overlib/shared/types';
import * as Util from 'overlib/shared/util';
import * as PropTypes from 'prop-types';
import * as React from 'react';

DataStore.registerDataStore(module, 'ReaderUX', {
  schema: {
    showFullScreenOverlay: Types.BOOL,
  },
});

let fullScreenOverlayCB: (() => void) | undefined = undefined;

export function createFullScreenOverlay(cb: () => void) {
  fullScreenOverlayCB = () => {
    fullScreenOverlayCB = undefined; // clear ourself
    cb();
  };
  DataStore.replaceData(['ReaderUX', 'showFullScreenOverlay'], true);
}

export function hideFullScreenOverlay() {
  DataStore.replaceData(['ReaderUX', 'showFullScreenOverlay'], false);
}

export class ReaderUX extends DataWatcher<{overlayRef: (node) => void}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private closeLightbox = () => {
    this.context.readerContext.closeLightbox();
  }

  render() {
    const imagesEntryIdx = this.context.readerContext.getUIState(this, ['lightboxImagesEntryIndex'], 1) as number | null;
    if (imagesEntryIdx !== null) {
      const entry = this.context.readerContext.getRawParsedData().entries[imagesEntryIdx];
      if (entry.type === EntryTypes.images) {
        const imageIdx = this.context.readerContext.getUIState(this, ['lightboxImageIndex'], 1) as number;
        return <ImageLightbox imageIndex={imageIdx} images={entry.images} onClose={this.closeLightbox} />;
      }
    }

    const showFullScreenOverlay = this.getData(['ReaderUX', 'showFullScreenOverlay'], 1);

    return (
      <div classes='top-0 left-0 w-10000000 h-10000000'>
        <Flex.Col classes='ai-s'>
          <Flex.Row classes='fg-1 ai-s'>
            <div classes='fg-1 ptrevt-n'/>
            <ScrollBar/>
          </Flex.Row>
        </Flex.Col>
        {showFullScreenOverlay ? <div
          classes='top-0 left-0 w-30000000 h-10000000 c-black-bg-a0.7'
          onClick={fullScreenOverlayCB}
          {...StandardAnims.fade()}
        /> : null}
        <div classes='top-0 left-0 w-10000000 h-10000000' ref={this.props.overlayRef}/>
      </div>
    );
  }
}
