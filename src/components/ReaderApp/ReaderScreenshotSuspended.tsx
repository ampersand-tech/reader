/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

export class ReaderScreenshotSuspended extends DataWatcher<{}, any> {
  static contextSchema: StashOf<Types.Schema> = {
  };

  static sampleContext: Stash = {
  };

  render() {
    const context = {
    };
    return <FixedTemplate template='ReaderScreenshotSuspended' context={context}/>;
  }
}

registerContextSchema(module, 'ReaderScreenshotSuspended', ReaderScreenshotSuspended.contextSchema, ReaderScreenshotSuspended.sampleContext);
