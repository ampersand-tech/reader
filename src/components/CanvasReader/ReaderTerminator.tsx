/**
 * Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider';
import { Paragraph } from 'clientjs/components/CanvasReader/Paragraph.tsx';
import { ParagraphData } from 'clientjs/components/CanvasReader/ParagraphUtils';
import { SANS_SERIF_FONT } from 'clientjs/components/CanvasReader/ReaderStyle';
import * as ReaderRoutes from 'clientjs/readerRoutes';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { FontDesc } from 'overlib/client/components/Layout/Font';
import * as Navigation from 'overlib/client/navigation';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const PERSONA_MASK = Util.objectMakeImmutable({
  name: 1,
  faceURL: 1,
});

export class ReaderTerminator extends DataWatcher<{}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  render() {
    if (this.context.readerContext.isPreview(this)) {
      return null;
    }
    const bottomBarHeight = this.context.readerContext.getUIState(this, ['bottomBarHeight']);
    const bookID = this.context.readerContext.getBookID();
    const distributionID = bookID.split('.')[0];
    const personaID = this.getData(['distributions', distributionID, 'metaData', 'personaID']) || '';
    const {faceURL, name} = this.getData(['persona', personaID], PERSONA_MASK) || '';
    const headerData: ParagraphData = {
      content: `Check out more by ${name}`,
      type: 'paragraph',
    };
    const headerFontDesc : FontDesc = {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 18,
      fontStyle: 'normal',
      fontWeight: 700,
      textDecoration: 'none',
      lineSpacing: 1.5,
      verticalAlign: 'baseline',
    };
    const header = (
      <Paragraph
        classes='ai-c c-readerText-fg'
        paragraph={headerData}
        paddingLeft={40}
        paddingRight={40}
        extraMissingWidth={20}
        font={headerFontDesc}
      />
    );
    const buttonData: ParagraphData = {
      content: 'VIEW AUTHOR',
      type: 'paragraph',
    };
    const buttonFontDesc: FontDesc = {
      fontFamily: SANS_SERIF_FONT,
      fontSize: 15,
      fontStyle: 'normal',
      fontWeight: 500,
      textDecoration: 'none',
      lineSpacing: 1.5,
      verticalAlign: 'baseline',
    };
    const button = (
      <Paragraph
        classes='ai-c c-black-fg'
        paragraph={buttonData}
        font={buttonFontDesc}
      />
    );
    const url = faceURL || Constants.CANVAS_READER_DEFAULT_USER_PIC;
    return !name ? (
      <Flex.Col classes={`p-t-100 p-b-80 m-b-${bottomBarHeight} w-10000`}>
        <svg name='icons/ampersand_logo.svg' classes='h-70 w-65 c-gandalf-fg op-0.5'/>
      </Flex.Col>
    ) :
      <Flex.Col classes={`p-t-30 p-b-80 h-300 w-10000 c-readerFrameBackground-bg ai-c`}>
        {header}
        <Flex.Row classes={`m-y-30 w-100 h-100 br-500 bgi-${url}`}/>
        <Flex.Row classes='p-x-20 p-y-8 br-300 c-readerPrimary-bg'
        onClick={() => Navigation.go(ReaderRoutes.author1(distributionID as Constants.DistributionID))}>
          {button}
        </Flex.Row>
      </Flex.Col>
    ;
  }
}
