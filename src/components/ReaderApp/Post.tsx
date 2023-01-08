/**
* Copyright 2017-present Ampersand Technologies, Inc.
*/

import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { PostTemplate, PostTemplateContext, PostTemplateDelegateContext } from 'clientjs/components/ReaderApp/PostTemplate.tsx';
import { UserTemplate, UserTemplateContext } from 'clientjs/components/UserTemplate.tsx';
import * as Metrics from 'clientjs/metrics';
import * as ReaderNotifications from 'clientjs/readerNotifications';
import * as Util from 'overlib/client/clientUtil';
import { ComponentMap } from 'overlib/client/template/Component.tsx';
import { TEST_FUNC } from 'overlib/shared/constants';
import * as Sketch from 'overlib/shared/sketch';
import * as Types from 'overlib/shared/types';
import * as React from 'react';

function dismissPost(postID: string): void {
  Metrics.recordInSet(Metrics.SET.READER.HOMEFEED, 'post.dismiss', {postID: postID});
  Sketch.runAction('dismiss.post', postID);
}

interface Props {
}

export class Post extends UserTemplate<Props, {}> {
  static propTypes = Util.copyFields(UserTemplate.propTypes, {
  });

  static contextSchema: StashOf<Types.Schema> = {
    delegates: {
      [PostTemplate.name]: {
        context: PostTemplate.contextSchema,
        templateFilename: Types.STRING,
        noErrors: Types.BOOL_NULLABLE,
      },
    },
    metricsClick: Types.FUNCTION,
  };

  static sampleContext: Stash = {
    delegates: {
      PostTemplate: {
        context: PostTemplate.sampleContext,
        templateFilename: 'userTemplates/post/tests/testPostSimple.tplt',
        noErrors: true,
      },
    },
    metricsClick: TEST_FUNC,
  };

  static customComponents = new ComponentMap({
    [PostTemplate.name]: new PostTemplate(),
  });

  _metricsDimensions = () => {
    if (!this.props.dataPath || this.props.dataPath.length < 4) {
      return undefined;
    }
    return {distributionID: this.props.dataPath[1], postID: this.props.dataPath[this.props.dataPath.length - 1]};
  }

  metricsClick = () => {
    if (!this.props.dataPath) {
      return;
    }
    Metrics.recordInSet(Metrics.SET.READER.HOMEFEED, 'post.clicked', this._metricsDimensions());
  }

  renderHelper(userTemplate: Stash, templateFilename: string, content: Stash|undefined): JSX.Element|null {
    // render normal post
    const isEditor = Boolean(this.props.editorPlatform);
    let userTemplateContext: PostTemplateDelegateContext;

    if (this.props.editorContext) {
      userTemplateContext = this.props.editorContext as UserTemplateContext;
    } else if (content) {
      const distributionID = (this.props.dataPath as string[])[1];
      const ids = {
        distID: distributionID,
        postID: this.props.dataPath ? this.props.dataPath[this.props.dataPath.length - 1] : '',
      };
      // Do not pass watcher, as we may clear the notifications and don't want to reflect that on this render pass
      const badgeCount = ReaderNotifications.getBadgeCount(null, 'post', ids);
      const clearBadges = () => { ReaderNotifications.clearBadges('post', ids); };
      if (badgeCount && !isEditor) {
        let hasSkuPicker: boolean = false;
        if (userTemplate.pickers) {
          for (const pickerName in userTemplate.pickers) {
            const pickerDesc = userTemplate.pickers[pickerName];
            if (pickerDesc.type === 'sku') {
              hasSkuPicker = true;
              break;
            }
          }
        }
        if (!hasSkuPicker) {
          // next frame, clear it if just viewing clears it
          // TODO: actually check if we scrolled down to it
          this.setTimeout(clearBadges, 0);
        }
      }
      userTemplateContext = this.getUserTemplateContext(userTemplate, content, clearBadges);

      Util.copyFields({
        hasBadge: badgeCount > 0,
        badgeCount: badgeCount,
        dismissPost: dismissPost.bind(null, ids.postID),
      }, userTemplateContext);
    } else {
      return null;
    }

    const context: PostTemplateContext = {
      delegates: {
        [PostTemplate.name]: {
          context: userTemplateContext,
          templateFilename: templateFilename,
          noErrors: isEditor,
        },
      },
      metricsClick: this.metricsClick,
    };

    return <FixedTemplate
      template='Post'
      context={context}
      metricsDims={this._metricsDimensions()}
      noErrors={isEditor}
    />;
  }
}

registerContextSchema(module, 'Post', Post.contextSchema, Post.sampleContext, Post.customComponents);
