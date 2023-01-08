/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { AnimationDef, AnimationTargetField } from 'overlib/client/components/Layout/LayoutAnimator';
import { EasingFunction } from 'overlib/shared/mathUtils';

const DEFAULT_FADE_TIME = 250;
const DEFAULT_FADE_EASE = 'easeInOutQuart';

export interface MountUnmountAnims {
  'data-anims': AnimationDef[];
  'data-unmountAnims': AnimationDef[];
}

function zeroToOne(field: AnimationTargetField, time?: number, easingFunction?: EasingFunction): MountUnmountAnims {
  time = time || DEFAULT_FADE_TIME;
  easingFunction = easingFunction || DEFAULT_FADE_EASE;
  const mountAnims: AnimationDef[] = [{
    key: 'mount',
    motivator: {
      source: 'time',
      easingFunction: easingFunction,
      start: 0,
      end: time,
    },
    modifier: {
      field: field,
      start: '0%',
      end: '100%',
    },
  }];

  const unmountAnims: AnimationDef[] = [{
    motivator: {
      source: 'time',
      easingFunction: easingFunction,
      start: 0,
      end: time,
    },
    modifier: {
      field: field,
      start: '100%',
      end: '0%',
    },
  }];

  return {
    'data-anims': mountAnims,
    'data-unmountAnims': unmountAnims,
  };
}

export function fade(time?: number, easingFunction?: EasingFunction): MountUnmountAnims {
  return zeroToOne('alpha', time, easingFunction);
}

export function bgColor(time?: number, easingFunction?: EasingFunction): MountUnmountAnims {
  return zeroToOne('backgroundColor', time, easingFunction);
}

export function slide(from: number, to: number, time: number = DEFAULT_SWIPE_TIME): MountUnmountAnims {
  return {
    'data-anims': [{
      key: 'slide-mount',
      motivator: {
        source: 'time',
        easingFunction: 'linear',
        start: 0,
        end: time,
      },
      modifier: {
        field: 'offsetX',
        start: to,
        end: from,
      },
    }],
    'data-unmountAnims': [{
      key: 'slide-unmount',
      motivator: {
        source: 'time',
        easingFunction: 'linear',
        start: 0,
        end: time,
      },
      modifier: {
        field: 'offsetX',
        start: from,
        end: -to,
      },
    }],
  };
}

export const DEFAULT_SWIPE_TIME = 200;

/// Slide in and out from the left side of the screen
export function slideLeft(screenWidth: number, time: number = DEFAULT_SWIPE_TIME): MountUnmountAnims {
  return slide(0, -screenWidth, time);
}

export function slideRight(screenWidth: number, time: number = DEFAULT_SWIPE_TIME): MountUnmountAnims {
  return slide(0, screenWidth, time);
}
