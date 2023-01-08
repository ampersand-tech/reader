/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { UserTemplateContext, UserTemplate } from 'clientjs/components/UserTemplate.tsx';
import { Component, PROP_TYPE } from 'overlib/client/template/Component';
import { Template, registerContextSchema } from 'overlib/client/template/Template.tsx';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as Types from 'overlib/shared/types';
import * as Util from 'overlib/shared/util';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface PostTemplateDelegateContextLocal {
  hasBadge: boolean;
  badgeCount: number;
  dismissPost: () => void;
}

export type PostTemplateDelegateContext = PostTemplateDelegateContextLocal | UserTemplateContext;

export interface PostTemplateContext {
  delegates: StashOf<PostTemplateDelegate>;
  metricsClick: () => void;
}

interface PostTemplateDelegate {
  context?: PostTemplateDelegateContext;
  templateFilename: string;
  noErrors?: boolean;
}

interface PostTemplateReactProps {
  delegate: PostTemplateDelegate;
}

class PostTemplateReact extends React.Component<PostTemplateReactProps, {}> {

  static propTypes = {
    delegate: PropTypes.object.isRequired,
  };

  render() {
    const delegate = this.props.delegate;
    return <Template
      context={delegate.context}
      template={delegate.templateFilename}
      noErrors={delegate.noErrors}
    />;
  }
}

export class PostTemplate extends Component {
  static contextSchema: StashOf<Types.Schema> = Util.copyFields(UserTemplate.userTemplateContextSchema, {
    hasBadge: Types.BOOL,
    badgeCount: Types.INT,
    dismissPost: Types.FUNCTION,
  });

  static sampleContext: Stash = {
    picker: {},
    badgeCount: 2,
    hasBadge: true,
    dismissPost: TEST_FUNC,
  };

  constructor() {
    super({
      delegate: PROP_TYPE.DELEGATE,
    }, false, false);
  }
  create(props: Stash, children: React.ReactElement<any>[], content: string | null, context: Stash): React.ReactElement<any>|null {
    this.process(props, children, content, context);
    return React.createElement(PostTemplateReact, props as PostTemplateReactProps, content);
  }
}

registerContextSchema(module, 'PostTemplate', PostTemplate.contextSchema, PostTemplate.sampleContext);
