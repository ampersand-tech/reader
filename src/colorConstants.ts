/**
 * Copyright 2015-present Ampersand Technologies, Inc.
 *
 */

import * as Constants from 'clientjs/shared/constants';
import * as color from 'color';
import * as Util from 'overlib/client/clientUtil';
import * as DomClassManager from 'overlib/client/domClassManager';

/**
 * @enum
 * @colors
 */
export const colors: StashOf<color> = {
  // colors from 'Mori Brand Assets and Policy' doc
  white: color('#FFFFFF'),
  pearl: color('#F5F5F5'),
  fog: color('#EEEEEE'),
  whisper: color('#E5E5E5'),
  darkFog: color('#DBDBDB'),
  iron: color('#D4D4D4'),
  ash: color('#B4B4B4'),
  smoke: color('#999999'),
  slate: color('#666666'),
  charcoal: color('#4D4D4D'),
  dirtyGandalf: color('#2E2E2E'),
  dirtierGandalf: color('#1F1F1F'),
  black: color('#000000'),

  pink: color('#D42653'),
  wine: color('#9B1C3C'),
  navy: color('#38404D'),
  navyDark: color('#353D42'),
  navylite: color('#E4E6E8'),
  submariner: color('#303540'),

  rose: color('#EFE8E7'),
  darkRose: color('#E4D9D7'),
  irish: color('#35A85A'),
  lake: color('#0A6BCE'),
  ochre: color('#BCA27D'),
  teal: color('#0092A3'),
  tealLight: color('#e4f9fa'),
  tealBright: color('#4DE5FD'),
  tealDark: color('#007885'),
  tealDarker: color('#005865'),
  purple: color('#8353DC'),
  lighterTeal: color('#00b5a3'),
  orangeGrad: color('#ff512f'),
  redGrad: color('#dd2476'),

  highlighter: color('#FFF49B'),
  highlighterReader: color('#F9F0C5'),
  whiskerReader: color('#EFA810'),
  highlighterDark: color('#FFF49B').darken(0.3),
  blueHighlighter: color('#C5E2FF'),
  selection: color('#C5E2FF'),
  selectionDark: color('#C5E2FF').darken(0.5),
  selectionDarkInactive: color('#C5E2FF').darken(0.15),

  // other recreational colors used in various reader color schemes
  warmWhite: color('#AAA6A2'),
  gandalf: color('#787878'),
  gunmetal: color('#1D1D1D'),
  navyHighlight: color('#e3e4e6'),
  darkNavy: color('#1f222F'),
  red: color('#D42626'),
  moriRed: color('#D42626'),
  redBorder: color('#D42626').alpha(0.25),
  almostNearBlack: color('#222'),
  nearBlack: color('#111'),
  transparent: color('#FFFFFF').alpha(0),
  linkBlue: color('#0000EE'),
  extrasBlue: color('#4B89DB'),
  onboardGreen: color('#1ACBBA'),
  onboardBlue: color('#2D63F4'),
  onboardPurple: color('#8354E9'),
  onboardPink: color('#DD2476'),
  onboardWhite: color('#FFFFFF'),
  bookShadow: color('#000000').alpha(0.25),
  midnight: color('#18182A'),
  deadOfNight: color('#191919'),

  // CMS
  cmsRed: color('#f5c7c7'),
  cmsRedDark: color('#D50000'),
  cmsGreen: color('#35a85a'),
  cmsYellow: color('#ffaf07'),
  cmsGreenDark: color('#35a85a').darken(0.3),
  cmsYellowDark: color('#ffaf07').darken(0.3),

  readerPrimary: color('#1dc0d7'),
  readerPrimaryDarkBG: color('#09e4ff'),
  readerSecondary: color('#09B4C0'),
  trench: color('#333333'),
  pigeon: color('#666F97'),
  gold: color('#FFAF07'),
  peach: color('#FEE6E3'),
  darkPeach: color('#FDCDC6'),

  sepiaBg: color('#E7DDC6'),
  sepiaBgDarker: color('#D7CDB6'),
  sepiaFg: color('#41330F'),
  sepiaIcon: color('#9B917A'),
  sepiaIconDisabled: color('#C9BFA8'),
  sepiaNote: color('#D9C9B3'),
  sepiaNoteRead: color('#CFBCA7'),

  readerDarkDisabled: color('#333333'),

  facebookBlue: color('#4267b2'),
  googleBlue: color('#4285F4'),

  // Reader Colors
  readerAppBackground: color('#181818'),
  readerAppHeader: color('#242224'),
  readerAppCtaText: color('#08e4ff'),
  readerAppLightText: color('#ffffff'),
  readerAppMediumText: color('#666666'),
  readerAppTeal: color('#3bddff'),

  // for testing only
  maroonInternal: color('maroon'),
  purpleInternal: color('purple'),
  fuchsiaInternal: color('fuchsia'),
  greenInternal: color('green'),
  limeInternal: color('lime'),
  oliveInternal: color('olive'),
  darkgoldenrodInternal: color('darkgoldenrod'),
  blueInternal: color('blue'),
  tealInternal: color('teal'),
  aquaInternal: color('aqua'),
  orangeInternal: color('orange'),
  TestString: color('#D42653'), // make fixed template tests happy
};


for (let i = 0; i < Constants.COLLAB_COLORS.colors.length; ++i) {
  colors['collab' + i] = color(Constants.COLLAB_COLORS.colors[i]);
  colors['collabHighlight' + i] = color(Constants.COLLAB_COLORS.highlightColors[i]);
}

interface ReaderSemanticColors {
  readerBackground: color;
  readerText: color;
  readerTextDimmed: color;
  readerFrameForeground: color;
  readerFrameBackground: color;
  readerFrameBorder: color;
  readerFrameButtonBG: color;
  readerFrameButtonSelected: color;
  readerFrameButtonSelectedFG: color;
  readerSubmenuBG: color;
  readerNoteBG: color;
  readerNoteBorder: color;
  readerNoteBarBG: color;
  readerNoteBarFG: color;
  readerReply: color;
  readerLayerBG: color;
  readerLayerText: color;
  readerLayerHighlight: color;
  readerLayerSelected: color;
  readerHashTagBG: color;
  readerHashTagHeader: color;
  readerReactionBarBG: color;
  readerReactionBG: color;
  readerReactionBorder: color;
  readerReactionSelected: color;
  readerLocationBG: color;
  readerLocationBGActive: color;
}

const readerLight: ReaderSemanticColors = {
  readerBackground: color('#fafafa'),
  readerText: color('#0f0f0f'),
  readerTextDimmed: color('#4a4a4a').alpha(0.5),
  readerFrameForeground: color('#2d2867'),
  readerFrameBackground: color('#e7e7e7'),
  readerFrameBorder: color('#b4b4b4'),
  readerFrameButtonBG: color('#000').alpha(0.06),
  readerFrameButtonSelected: color('#2d2051'),
  readerFrameButtonSelectedFG: color('#fafafa'),
  readerSubmenuBG: colors.white,
  readerNoteBG: colors.white,
  readerNoteBorder: colors.fog,
  readerNoteBarBG: color('#fafafa'),
  readerNoteBarFG: color('#999999'),
  readerReply: color('#1dc0d7'),
  readerLayerBG: color('#cce4ea'),
  readerLayerText: color('#0f0f0f'),
  readerLayerHighlight: color('#168ea8'),
  readerLayerSelected: color('#168ea8').darken(0.3),
  readerHashTagBG: color('#2d2867').alpha(0.09),
  readerHashTagHeader: color('#0e1928').alpha(0.3),
  readerReactionBarBG: color('#a4a4a4'),
  readerReactionBG: color('#e6e6e6'),
  readerReactionBorder: color('#cccccc'),
  readerReactionSelected: color('#1dc0d7'),
  readerLocationBG: colors.white,
  readerLocationBGActive: color('#CCCCCC'),
};

const readerDark: ReaderSemanticColors = {
  readerBackground: color('#181818'),
  readerText: color('#d1d3d4'),
  readerTextDimmed: colors.white.alpha(0.5),
  readerFrameForeground: color('#d1d3d4'),
  readerFrameBackground: color('#212121'),
  readerFrameBorder: color('#212121').darken(0.5),
  readerFrameButtonBG: color('#414042'),
  readerFrameButtonSelected: color('white'),
  readerFrameButtonSelectedFG: color('black'),
  readerSubmenuBG: colors.black,
  readerNoteBG: color('#181818'),
  readerNoteBorder: color('#181818').alpha(0.5),
  readerNoteBarBG: color('#0F0F0F'),
  readerNoteBarFG: colors.white,
  readerReply: color('#7af0ff'),
  readerLayerBG: color('#218ea6'),
  readerLayerText: color('white'),
  readerLayerHighlight: color('white'),
  readerLayerSelected: color('white'),
  readerHashTagBG: color('white').alpha(0.2),
  readerHashTagHeader: color('#cccccc'),
  readerReactionBarBG: color('#4d4d4d'),
  readerReactionBG: color('#333333'),
  readerReactionBorder: color('#4D4D4D'),
  readerReactionSelected: color('#1dc0d7').alpha(0.7),
  readerLocationBG: colors.black,
  readerLocationBGActive: color('#222222'),
};

export let readerColors: ReaderSemanticColors = readerDark;

// This has a side effect of setting the exported readerColors
function getCombinedColors(scheme: Constants.ReaderColor) {
  if (scheme === Constants.READER_COLOR.DARK) {
    readerColors = readerDark;
  } else {
    readerColors = readerLight;
  }

  const newColors = Util.shallowClone(colors);
  for (const attr in readerColors) {
    newColors[attr] = readerColors[attr];
  }
  return Util.objectMakeImmutable(newColors);
}

export function isColorString(colorString: string): boolean {
  const colorHexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!colorString) {
    return false;
  }
  if (colorString.match(colorHexRegex) || colors[colorString]) {
    return true;
  }
  return false;
}

export function updateColorConstants(scheme: Constants.ReaderColor) {
  const colorConstants = getCombinedColors(scheme);
  DomClassManager.setColorConstants(colorConstants);
}
