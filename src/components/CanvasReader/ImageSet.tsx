/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import { EntryTypes } from 'clientjs/shared/readerParse';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as Util from 'overlib/shared/util';
import * as PropTypes from 'prop-types';
import * as React from 'react';


const IMG_PCT = 0.75;

interface ImageThumbProps {
  entryIdx: number;
  imageIdx: number;
}

class ImageThumb extends DataWatcher<ImageThumbProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  render() {
    const entry = this.context.readerContext.getRawParsedData().entries[this.props.entryIdx];
    if (entry.type !== EntryTypes.images) {
      return null;
    }

    const image = entry.images[this.props.imageIdx];

    const availableWidth = this.context.readerContext.getUIState(this, ['page', 'width']);
    const renderWidth = availableWidth * 0.8 / (1 + (1 - IMG_PCT) * (entry.images.length - 1));
    const renderHeight = renderWidth * image.height / image.width;
    const imageStyle = {
      width: renderWidth,
      height: renderHeight,
      marginLeft: this.props.imageIdx === 0 ? 0 : (-renderWidth * IMG_PCT),
    };
    return (
      <img
        src={image.url}
        style={imageStyle}
      />
    );
  }
}

interface ImageSetProps {
  entryIdx: number;
}

export class ImageSet extends DataWatcher<ImageSetProps, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private onClick = () => {
    this.context.readerContext.openLightbox(this.props.entryIdx, 0);
  }

  render() {
    const entry = this.context.readerContext.getRawParsedData().entries[this.props.entryIdx];
    if (entry.type !== EntryTypes.images) {
      return null;
    }
    const thumbs: JSX.Element[] = [];
    for (let i = 0; i < entry.images.length; ++i) {
      thumbs.push(<ImageThumb key={i} entryIdx={this.props.entryIdx} imageIdx={i} />);
    }
    return (
      <Flex.Row classes='ai-fs' onClick={this.onClick} data-drawReversed={true}>
        <div classes='fg-1'/>
        {thumbs}
        <div classes='fg-1'/>
      </Flex.Row>
    );
  }
}
