/**
 * Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { SvgIcon } from 'overlib/client/components/SvgIcon.tsx';
import * as React from 'react';

export class Terminator extends DataWatcher<{}, {}> {
  render() {
    return (
      <Flex.Col classes='p-t-100 p-b-80 cc'>
        <SvgIcon svgName='icons/ampersand_logo.svg' classes='h-70 w-65 c-gandalf-fg op-0.5'/>
      </Flex.Col>
    );
  }
}
