/**
* Copyright 2017-present Ampersand Technologies, Inc.
*
*/

import { FixedTemplate } from 'clientjs/components/FixedTemplate.tsx';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import { Component } from 'overlib/client/template/Component';
import { registerContextSchema } from 'overlib/client/template/Template.tsx';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

export interface NavOverlayContext {
  hasAdminMenu: boolean;
}

export class NavOverlayReact extends DataWatcher<{}, {}> {
  static contextSchema: StashOf<Types.Schema> = {
    hasAdminMenu: Types.BOOL,
  };

  static sampleContext: Stash = {
    hasAdminMenu: false,
  };

  render() {
    const context : NavOverlayContext = {
      hasAdminMenu: this.getData(['App', 'isAdmin']) && this.getData(['localSettings', 'readerAdminMenu']),
    };

    return (
      <FixedTemplate template='NavOverlay' context={context} />
    );
  }
}

export class NavOverlay extends Component {
  constructor() {
    super({
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(NavOverlayReact, props, content);
  }
}

registerContextSchema(module, 'NavOverlay', NavOverlayReact.contextSchema, NavOverlayReact.sampleContext);



