/**
 * Copyright 2016-present Ampersand Technologies, Inc.
*
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { InstrumentedDataWatcher } from 'clientjs/InstrumentedDataWatcher.tsx';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

interface NotificationsContext {
}

export class NotificationsTab extends InstrumentedDataWatcher<{}, {}> {
  static noTransition = true;

  static contextSchema: StashOf<Types.Schema> = {
  };

  static sampleContext: Stash = {
  };

  componentWillMount() {
    super.componentWillMount();
    Sketch.runAction('alertsStatus.seenIt');
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    Sketch.runAction('alertsStatus.seenIt');
  }

  render() {
    const context : NotificationsContext = {
    };

    return (
      <FixedTemplate template='NotificationsTab' testid='NotificationsTab' context={context} />
    );
  }
}

registerContextSchema(module, 'NotificationsTab', NotificationsTab.contextSchema, NotificationsTab.sampleContext);
