/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/
import { SANS_SERIF_FONT } from 'clientjs/components/CanvasReader/ReaderStyle';
import * as UserColors from 'clientjs/components/ReaderUI/UserColors.tsx';
import * as KnownData from 'clientjs/KnownData';
import * as Constants from 'clientjs/shared/constants';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { FontDesc } from 'overlib/client/components/Layout/Font';
import * as React from 'react';

interface FaceProps {
  accountID: string;
  classes?: string;
  size?: number;
  colorSet?: number;
  noColor?: boolean;
  mayBeUnknown?: boolean;
}

const CONTACT_MASK = Util.objectMakeImmutable({
  faceURL: 1,
  name: 1,
});

export class CanvasFace extends DataWatcher<FaceProps, {}> {

  render() {

    const contact = KnownData.getKnownInfo(this, 'contacts', this.props.accountID, CONTACT_MASK, this.props.mayBeUnknown);
    const faceURL = (contact && contact.faceURL); //? contact.faceURL : Util.assetUrl(Constants.DEFAULT_USER_PIC);

    const colorSet = (this.props.colorSet === null || this.props.colorSet === undefined) ?
      Constants.colorSetFromID(this.props.accountID) :
      this.props.colorSet;
    const userColors = UserColors.getAllUserColors(this);
    const baseColor = userColors[colorSet].inlineBase;
    const duotoneDark = userColors[colorSet].duotoneDark;
    baseColor;
    duotoneDark;
    const sz: number = this.props.size || 20;

    const iconClasses = `w-${sz} h-${sz} br-${sz * 0.5} o-h`;

    if (faceURL) {

      const classes = Util.combineClasses(iconClasses, 'bgs-cover bg-c bgr-n', this.props.classes);
      const imageStyle = {
        backgroundImage: `url(${faceURL})`,
      };

      return (
        <div classes={classes} style={imageStyle}/>
      );
    } else {
      const classes = Util.combineClasses(iconClasses, 'c-gandalf-bg cc', this.props.classes);

      const descFont: FontDesc = {
        fontFamily: SANS_SERIF_FONT,
        fontSize: 17,
        fontStyle: 'normal',
        fontWeight: 400,
        textDecoration: 'none',
        lineSpacing: 1.75,
        verticalAlign: 'baseline',
      };

      return (
        <Flex.Col classes={classes}>
          <div classes='c-white-fg' style={descFont}>{contact.name.slice(0, 1).toUpperCase()}</div>
        </Flex.Col>
      );
    }
  }
}
