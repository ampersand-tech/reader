/**
* Copyright 2017-present Ampersand Technologies, Inc.
*
*/

import * as ReaderParse from 'clientjs/shared/readerParse';
import * as Content from 'overlib/client/content';
import * as Log from 'overlib/client/log';
import * as DataStore from 'overlib/shared/dataStore';
import * as ObjSchema from 'overlib/shared/objSchema';
import * as Types from 'overlib/shared/types';

/*
 * Put all data needed to render the canvas layouts here
 */

export interface ReactionDesc {
  desc: string;
  icon: string;
  enabled?: boolean;
  deprecated?: boolean; // deprecated means keep it around so we can render the icons that have been left, but don't show it in the picker
  subReactions?: StashOf<ReactionDesc>;
}

export interface SentimentDesc {
  icon: string;
  desc: string;
}

export interface TopicDesc {
  icon: string;
  enabled: boolean;
}

const gRenderDataSchema: Types.Schema = {
  parsedData: Types.OBJECT,

  // Old system
  reactions: ObjSchema.MAP({
    enabled: Types.BOOL,
    desc: Types.STRING,
    icon: Types.STRING,
    subReactions: ObjSchema.MAP({
      desc: Types.STRING,
      icon: Types.STRING,
      deprecated: Types.BOOL,
    }),
  }),
  defaultBar: Types.STRING,

  // Sentiment system
  sentiments: ObjSchema.MAP({
    icon: Types.STRING,
    desc: Types.STRING,
  }),
};

DataStore.registerDataStore(module, 'RenderData', {
  schema: ObjSchema.MAP(gRenderDataSchema),
  allowSubobjectCreate: true,
});

interface ButtonDesc {
  name: string;
  icon: string;
}

function validButton(reaction: ButtonDesc): boolean {
  return Boolean(reaction.name && reaction.icon && Content.contentUrl(null, reaction.icon, true));
}


export function initDataStore(contentID, parsedData : ReaderParse.ParsedData): {hasButtons: boolean} {
  const path = ['RenderData', contentID];

  if (!DataStore.hasData(path)) {
    DataStore.resetToDefaults(path);
  }
  DataStore.replaceData(path.concat('parsedData'), parsedData);
  // hardcode for now
  let reactions: StashOf<ReactionDesc> = {
    'note': {
      desc: 'Leave a note',
      icon: 'templateImages/reactions/general/icon_reader_feedback_solid_parent_note.png',
      enabled: true,
    },
  };

  // walk the parsedData buttons for per-doc reactions
  let hasButtons = false;
  for (const parent of parsedData.entries) {
    if (parent.type !== 'button') {
      continue;
    }

    const parentButtonID = parent.name;

    if (parentButtonID === 'note') {
      continue;
    }
    hasButtons = true;
    let subReactions = {};
    if (!validButton(parent)) {
      Log.warn('@sam', 'invalid.parent.button', {url: Content.contentUrl(null, parent.icon, true), parent});
      parent.icon = 'templateImages/reactions/general/icon_reader_feedback_solid_yay_2.png';
    }
    for (const subReactionID in parent.reaction) {
      if (subReactionID === 'note') {
        continue;
      }
      const subReaction = parent.reaction[subReactionID];
      if (!validButton(subReaction)) {
        Log.warn('@sam', 'invalid.subreaction.button', subReaction);
        subReaction.icon = 'templateImages/reactions/general/icon_reader_feedback_solid_yay_2.png';
      }
      let subID = subReaction.name;
      let subDesc = subReaction.name;
      // Here be crimes against nature!
      if (subDesc.indexOf(']') >= 0) {
        const splt = subDesc.split(']');
        subID = splt[0];
        subDesc = splt[1];
      }
      subReactions[subID] = {
        desc: subDesc,
        icon: subReaction.icon,
      };
    }
    let parentID = parent.name;
    let desc = parent.name;
    // Here be crimes against nature!
    if (desc.indexOf(']') >= 0) {
      const splt = desc.split(']');
      parentID = splt[0];
      desc = splt[1];
    }
    reactions[parentID] = {
      desc: desc,
      icon: parent.icon,
      subReactions: subReactions,
    };
  }
  DataStore.replaceData(path.concat('reactions'), reactions);

  let defaultBar;
  const buttonCategories = Object.keys(reactions);
  if (buttonCategories.length > 2) {
    defaultBar = buttonCategories[2];
  } else {
    defaultBar = buttonCategories[1];
  }
  if (defaultBar) {
    DataStore.replaceData(path.concat('defaultBar'), defaultBar);
  }

  // Sentiment system
  let sentiments: StashOf<SentimentDesc> = {
    love: {
      desc: 'What are you loving?',
      icon: 'icons/icon_reader_feedback_sentiment_heart.svg',
    },
    like: {
      desc: 'What are you liking?',
      icon: 'icons/icon_reader_feedback_solid_thumb_up_v2.svg',
    },
    dislike: {
      desc: 'What are you disliking?',
      icon: 'icons/icon_reader_feedback_solid_thumb_down_v2.svg',
    },
    funny: {
      desc: 'What are you hahaing?',
      icon: 'icons/icon_reader_feedback_haha.svg',
    },
    exclamation: {
      desc: 'What are you exclamationing?',
      icon: 'icons/icon_reader_feedback_exclamations.svg',
    },
    question: {
      desc: 'What are you questioning?',
      icon: 'icons/icon_reader_feedback_question_mark.svg',
    },
    note: {
      desc: 'Leave a note',
      icon: 'icons/icon_reader_feedback_note_v2.svg',
    },
  };
  DataStore.replaceData(path.concat('sentiments'), sentiments);

  return {hasButtons};
}

export function cleanUpDataStore(contentID) {
  const path = ['RenderData', contentID];
  DataStore.removeData(path);
}
