/**
* Copyright 2016-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { TEST_FUNC } from 'clientjs/shared/constants';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as DataStore from 'overlib/shared/dataStore';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

export class DemoWelcome extends DataWatcher<{}, any> {
  state = {
    opacity: 1,
  };

  static contextSchema: StashOf<Types.Schema> = {
    onClick: Types.FUNCTION,
    opacity: Types.NUMBER,
  };

  static sampleContext: Stash = {
    onClick: TEST_FUNC,
    opacity: 1,
  };

  private onClick = () => {
    this.setState({ opacity: 0 });
    this.setTimeout(() => {
      DataStore.updateData(['App', 'showDemoScreen'], false);
    }, 250);
  }

  render() {
    const context = {
      onClick: this.onClick,
      opacity: this.state.opacity,
    };
    return <FixedTemplate template='DemoWelcome' context={context}/>;
  }
}

registerContextSchema(module, 'DemoWelcome', DemoWelcome.contextSchema, DemoWelcome.sampleContext);
