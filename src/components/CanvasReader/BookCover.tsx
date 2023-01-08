/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import * as Nav from 'clientjs/components/CanvasReader/Nav';
import * as Paragraph from 'clientjs/components/CanvasReader/Paragraph.tsx';
import { SANS_SERIF_FONT } from 'clientjs/components/CanvasReader/ReaderStyle';
import { ReleasedItemSchema } from 'clientjs/shared/cmsDataDB';
import * as Constants from 'clientjs/shared/constants';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { FontDesc } from 'overlib/client/components/Layout/Font';
import * as Util from 'overlib/shared/util';
import * as PropTypes from 'prop-types';
import * as React from 'react';

let CMS_ITEM_MASK = Util.objectMakeImmutable({
  contentType: 1,
  coverImageURL: 1,
  title: 1,
  bgColor1: 1,
  bgColor2: 1,
});


interface BookCoverProps {
  advancePage?: () => void;
  width: number;
  height: number;
  dataPath: string[];
  title?: string;
  authorName?: string;
}

export class BookCover extends DataWatcher<BookCoverProps, {}> {
  render() {
    let content: ReleasedItemSchema = this.getData(this.props.dataPath, CMS_ITEM_MASK);
    let url: string | undefined = content && content.coverImageURL;

    if (!url || !this.props.width || !this.props.height) {
      return <div classes='h-100 m-b-40'/>;
    }

    let contentType: Constants.ContentType = content.contentType;
    let aspectRatio = Constants.contentTypeAspectRatio(contentType);

    const width = this.props.width * 0.8;
    const margin = this.props.width * 0.15;
    const height = width * aspectRatio;

    const imgStyle: React.CSSProperties = {
      backgroundImage: 'url(' + url + ')',
      backgroundSize: 'contain',
      width: width + 'px',
      height: height + 'px',
    };

    const bgStyle: React.CSSProperties = {
      width: this.props.width + 'px',
      height: this.props.height + 'px',
    };
    const font: React.CSSProperties = {
      fontFamily: SANS_SERIF_FONT,
    };

    let workShopDetails: JSX.Element[] | null = null;
    if (contentType === Constants.CONTENT_TYPE.WORKSHOP) {
      const title: string = this.props.title || content.title || '';
      const personaID = this.getData(this.props.dataPath.slice(0, 2).concat(['metaData', 'personaID']));
      let authorName = this.props.authorName || this.getData(['persona', personaID, 'name']);
      if (authorName) {
        authorName = 'by ' + authorName;
      }
      const fontDesc: FontDesc = {
        fontFamily: SANS_SERIF_FONT,
        fontSize: 24,
        fontStyle: 'normal',
        fontWeight: 400,
        textDecoration: 'none',
        lineSpacing: 1.75,
        verticalAlign: 'baseline',
      };
      workShopDetails = [
        <Paragraph.Text
          key='title'
          font={fontDesc}
          width={width * 0.8}
          classes={`c-white-fg m-t-30 txtshdw-1-1-3-rgba[0,0,0,0.4] ai-c`}
        >
          {title}
        </Paragraph.Text>,
        <div
          key='author'
          style={font}
          classes={`fs-16 c-white-fg m-t-5 txtshdw-1-1-3-rgba[0,0,0,0.4] m-x-${margin}`}
        >
          {authorName}
        </div>,
      ];
    }

    const color1 = content.bgColor1 || '#231f20';
    const color2 = content.bgColor2 || '#414042';

    return (
      <Flex.Col classes={`cc grad-h-${color1}-${color2}`} style={bgStyle} onClick={this.props.advancePage}>
        <div classes='bxshdw-5-5-30-0-rgba[0,0,0,0.4]' style={imgStyle} />
        {workShopDetails}
      </Flex.Col>
    );
  }
}

export class BookCoverReader extends DataWatcher<{}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  private advancePage = () => {
    this.context.readerContext.navTo && this.context.readerContext.navTo({
      type: 'paragraph',
      entryIdx: 1,
    }, Nav.NAV_PLACEMENT.TOP, false, 'nav.cover.click');
  }
  render() {
    const splitID = this.context.readerContext.getBookID().split('.');
    const distributionID = splitID[0];
    const itemID = splitID[1];
    const dataPath = ['distributions', distributionID, 'items', itemID];
    return (
      <BookCover
        advancePage={this.advancePage}
        width={this.context.readerContext.getUIState(this, ['page', 'width'])}
        height={this.context.readerContext.getUIState(this, ['page', 'height'])}
        dataPath={dataPath}
      />
    );
  }
}
