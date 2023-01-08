/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { ProviderContext } from 'clientjs/components/CanvasReader/ContextProvider.tsx';
import { EMOJI_TABLE } from 'clientjs/components/CanvasReader/EmojiTable';
import { FixedTemplate, registerContextSchema } from 'clientjs/components/FixedTemplate.tsx';
import { REACTION_TYPE } from 'clientjs/shared/constants';
import { DataWatcher } from 'overlib/client/components/DataWatcher.tsx';
import * as Log from 'overlib/client/log';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';
import * as Util from 'overlib/shared/util';
import * as PropTypes from 'prop-types';
import * as React from 'react';

const REACTIONS_MASK = Util.objectMakeImmutable({
  _ids: {
    userID: {
      _ids: {
        count: 1,
      },
    },
  },
});

interface userInfo {
  accountID: string;
}

interface reactionInfoSchema {
  url: string;
  isSVG: boolean;
  isPNG: boolean;
  isEmoji: boolean;
  rxnName: string;
  count: number;
  users: userInfo[];
}

interface BreakdownContext {
  breakdown: reactionInfoSchema[];
}

export class ReaderReactionBreakdown extends DataWatcher<{}, {}> {
  context: ProviderContext;
  static contextTypes = Util.shallowCloneAndCopy(DataWatcher.contextTypes, {
    readerContext: PropTypes.object.isRequired,
  });

  static contextSchema: StashOf<Types.Schema> = {
    breakdown: ObjSchema.ARRAY_OF({
      url: Types.STRING,
      isSVG: Types.BOOL,
      isPNG: Types.BOOL,
      isEmoji: Types.BOOL,
      rxnName: Types.STRING,
      count: Types.INT,
      users: ObjSchema.ARRAY_OF({
        accountID: Types.STRING,
      }),
    }),
  };

  static sampleContext: Stash = {
    breakdown: [
      {
        url: 'icons/ampersand_logo.svg',
        rxnName: 'rxn',
        isSVG: true,
        isPNG: false,
        isEmoji: false,
        count: 1,
        users: [
          {
            accountID: '6',
          },
          {
            accountID: '6',
          },
        ],
      },
      {
        url: 'icons/ampersand_logo.svg',
        rxnName: 'rxn',
        isSVG: true,
        isPNG: false,
        isEmoji: false,
        count: 1,
        users: [
          {
            accountID: '6',
          },
          {
            accountID: '6',
          },
        ],
      },
    ],
  };

  getIconUrl = (ids, reactionType) => {
    switch (reactionType) {
      case REACTION_TYPE.WORKSHOP:
        return this.context.readerContext.getRenderData(this, ['reactions', ids[0], 'subReactions', ids[1], 'icon']) || '';
      case REACTION_TYPE.SENTIMENT:
        let sentiment;
        if (ids.length === 1) {
          sentiment = ids[0];
        } else {
          sentiment = ids[1];
        }
        return this.context.readerContext.getRenderData(this, ['sentiments', sentiment, 'icon']) || '';
      case REACTION_TYPE.EMOJI:
        return EMOJI_TABLE[ids[0]][ids[1]];
      default:
        return Log.error('@unassigned', 'invalid reactionType');
    }
  }

  render() {
    const reactionPath = this.context.readerContext.getUIState(this, ['reactionPath']);
    const breakdown: reactionInfoSchema[] = [];

    if (reactionPath && reactionPath.length > 0) {
      const reactions: Stash = this.context.readerContext.getReactionGroupData(this, reactionPath, REACTIONS_MASK);
      for (const rid in reactions) {
        const reactionType = this.context.readerContext.getReactionGroupData(this, reactionPath.concat([rid, 'reactionType']));
        const ids = rid.split(':');
        const url = this.getIconUrl(ids, reactionType);
        const reaction = reactions[rid];
        const users: userInfo[] = [];
        for (const accountID in reaction.userID) {
          users.push({
            accountID,
          });
        }

        breakdown.push({
          url,
          users,
          rxnName: ids[ids.length - 1],
          isSVG: reactionType === REACTION_TYPE.WORKSHOP && Util.startsWith(url, 'icons/'),
          isPNG: reactionType === REACTION_TYPE.WORKSHOP && !Util.startsWith(url, 'icons/'),
          isEmoji: reactionType === REACTION_TYPE.EMOJI,
          count: users.length,
        });
      }
    }

    const context: BreakdownContext = {
      breakdown,
    };

    return (
      <FixedTemplate template='ReaderReactionBreakdown' testid='ReaderReactionBreakdown' context={context} />
    );
  }
}

registerContextSchema(module, 'ReaderReactionBreakdown', ReaderReactionBreakdown.contextSchema, ReaderReactionBreakdown.sampleContext);
