/**
* Copyright 2018-present Ampersand Technologies, Inc.
*/

import { SkuLink } from 'clientjs/components/ReaderApp/SkuLink';
import * as Util from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Flex from 'overlib/client/components/Flex.tsx';
import * as React from 'react';

const DEFAULT_SIZE = 100;
const IPAD_MARGIN = 72;
const IPHONE_MARGIN = 24;
const IPAD_WIDTH = 768;

interface SkuCollectionProps {
  skus: Stash;
  gap?: number;
  size?: number;
  noAuthor?: boolean;
}

export class SkuCollection extends DataWatcher<SkuCollectionProps, {}> {

  // assumes takes up entire screen except margins, not based on parent container
  private getSizes = (scale: number) => {
    const windowWidth = window.innerWidth;
    const margin = windowWidth >= IPAD_WIDTH ? IPAD_MARGIN : IPHONE_MARGIN;
    const totalWidth = windowWidth - 2 * margin;
    const size = Math.ceil(scale * (this.props.size || DEFAULT_SIZE));
    const gap = Math.ceil(scale * (this.props.gap || 0));
    if (gap < 0 || size < 0) {
      return {
        containerWidth: 0, // ensures gap + size will never be 0
        size,
        gap,
        rowLength: 2, // ?
      };
    }
    if (size > totalWidth) {
      return {
        containerWidth: 0,
        size,
        gap,
        rowLength: 1,
      };
    }
    if (size + gap > totalWidth) {
      return {
        containerWidth: size,
        size,
        gap,
        rowLength: 1,
      };
    }
    let rowLength = Math.floor(totalWidth / (gap + size));
    if (rowLength * (gap + size) + size <= totalWidth) {
      rowLength++;
    }
    return {
      containerWidth: (rowLength * (gap + size) - gap),
      size,
      gap,
      rowLength,
    };
  }

  render() {
    const renderedSkus : any[] = [];
    const skus = this.props.skus;
    if (!skus) { return null; }
    const single = skus.length === 1;
    let scale = 1;
    let sizes = this.getSizes(scale);
    while (scale > 0.5 && sizes.rowLength < 2) {
      scale -= 0.1;
      sizes = this.getSizes(scale);
    }

    let curWidth = 0;
    for (const skuID in skus) {
      // if here, due to container width, you should always fit this in
      curWidth += sizes.size;
      renderedSkus.push(
        <Flex.Col key={skuID} classes=''>
          <SkuLink skuPath={skus[skuID].skuPath} size={sizes.size} gap={sizes.gap} single={single} noAuthor={this.props.noAuthor}/>
        </Flex.Col>);
      if (curWidth + sizes.gap < sizes.containerWidth) {
        renderedSkus.push(<Flex.Col key={skuID + 'gap'} classes={'w-' + sizes.gap} />);
        curWidth += sizes.gap;
      } else {
        curWidth = 0;
      }
    }

    let rowClasses = 'flxw-w jc-sb w-' + sizes.containerWidth;
    if (skus.length < 3) {
      rowClasses = Util.combineClasses(rowClasses, 'jc-c');
    } else {
      renderedSkus.push(<Flex.Col key='filler' classes='flx-1-1-a'/>);
    }
    return (
      <Flex.Col classes='ai-c'>
        <Flex.Row classes={rowClasses} ref='gridRow'>
          {renderedSkus}
        </Flex.Row>
     </Flex.Col>
    );
  }
}
