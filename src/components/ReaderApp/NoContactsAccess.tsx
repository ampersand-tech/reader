/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Navigation from 'overlib/client/navigation';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface NoContactsAccessContext {
  goBack: () => void;
}

export class NoContactsAccess extends DataWatcher<{}, {}> {

  static contextSchema: Stash = {
    goBack: Types.FUNCTION,
  };

  static sampleContext: Stash = {
    goBack: TEST_FUNC,
  };

  goBack() {
    Navigation.goBack();
  }

  render() {

    const context : NoContactsAccessContext = {
      goBack: this.goBack,
    };

    return <FixedTemplate template='NoContactsAccess' context={context}/>;
  }
}

registerContextSchema(module, 'NoContactsAccess', NoContactsAccess.contextSchema, NoContactsAccess.sampleContext);
