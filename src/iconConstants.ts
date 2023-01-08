/**
 * Copyright 2014-present Ampersand Technologies, Inc.
 *
 *
 */

import * as Util from 'overlib/shared/util';

const SvgAmpersandLogo = 'icons/ampersand_logo.svg';
const SvgAmpersandLogoNameBelow = 'icons/ampersand_logo_name_below.svg';
const SvgChannelInfo = 'icons/Icon_Channel_Info.svg';
const SvgChannelStore = 'icons/Icon_Channel_Store.svg';
const SvgChevronLeft = 'icons/chevrons_thin_L.svg';
const SvgDarkEllipsis = 'icons/icon_ellipsis-dark_horizontal.svg';
const SvgFontLarger = 'icons/icon_reader_size_larger.svg';
const SvgFontSmaller = 'icons/icon_reader_size_smaller.svg';
const SvgIconAccount = 'icons/icon_reader_tabBar_ipad-account.svg';
const SvgIconAddFriend = 'icons/icon_add_friend.svg';
const SvgIconAngel = 'icons/icon_reader_feedback_angel.svg';
const SvgIconBallpointPenPaper = 'icons/icon_reader_feedback_ballpointpenandpaper.svg';
const SvgIconBookMagnifier = 'icons/icon_reader_feedback_bookmagnifier.svg';
const SvgIconBored = 'icons/icon_reader_feedback_bored.svg';
const SvgIconBoredZ = 'icons/icon_reader_feedback_bored_z.svg';
const SvgIconBrain = 'icons/icon_reader_feedback_brain.svg';
const SvgIconC3PO = 'icons/icon_reader_feedback_c3po.svg';
const SvgIconCatalog = 'icons/icon_reader_tabbar_catalog.svg';
const SvgIconChat = 'icons/icon_reader_feedback_chat.svg';
const SvgIconCheckmark = 'icons/icon_checkmark.svg';
const SvgIconChemistry = 'icons/icon_reader_feedback_chemistry.svg';
const SvgIconChevronL = 'icons/chevrons_thin_L.svg';
const SvgIconChevronR = 'icons/chevrons_thin_R.svg';
const SvgIconClapping = 'icons/icon_reader_feedback_clap.svg';
const SvgIconCloudRain = 'icons/icon_reader_feedback_cloud_raining.svg';
const SvgIconConfused = 'icons/icon_reader_feedback_confused.svg';
const SvgIconCrystal = 'icons/icon_reader_feedback_crystal.svg';
const SvgIconCuriousCat = 'icons/icon_reader_feedback_curiouscat.svg';
const SvgIconDaggers = 'icons/icon_reader_feedback_daggers_crossed.svg';
const SvgIconDanger = 'icons/icon_reader_feedback_danger.svg';
const SvgIconDated = 'icons/icon_reader_feedback_dated.svg';
const SvgIconDated2 = 'icons/icon_reader_feedback_dated2.svg';
const SvgIconDeathStar = 'icons/icon_reader_feedback_deathstar.svg';
const SvgIconDevil = 'icons/icon_reader_feedback_devil.svg';
const SvgIconDislike = 'icons/icon_reader_feedback_dislike.svg';
const SvgIconDoubleChevronLeft = 'icons/icon_doublechevron-left.svg';
const SvgIconDoubleChevronRight = 'icons/icon_doublechevron-right.svg';
const SvgIconDramaMasks = 'icons/icon_reader_feedback_drama_masks.svg';
const SvgIconEarth = 'icons/icon_reader_feedback_earth.svg';
const SvgIconEngaging = 'icons/icon_reader_feedback_engaging.svg';
const SvgIconEyeFemale = 'icons/icon_reader_feedback_eye_female.svg';
const SvgIconFactcheck = 'icons/icon_reader_feedback_factcheck.svg';
const SvgIconFeatherPen = 'icons/icon_reader_feedback_featherpen.svg';
const SvgIconFedora = 'icons/icon_reader_feedback_fedora.svg';
const SvgIconFeedback = 'icons/icon_reader_feedback.svg';
const SvgIconFemale = 'icons/icon_reader_feedback_symbol_female.svg';
const SvgIconFirefly = 'icons/icon_reader_feedback_firefly.svg';
const SvgIconFistBump = 'icons/icon_reader_feedback_fist_bump.svg';
const SvgIconFlag = 'icons/icon_reader_feedback_flag.svg';
const SvgIconFlower = 'icons/icon_reader_feedback_flower.svg';
const SvgIconFrown = 'icons/icon_reader_feedback_frown.svg';
const SvgIconFrustrated = 'icons/icon_reader_feedback_frustrated.svg';
const SvgIconGamePlan = 'icons/icon_reader_feedback_gamePlan.svg';
const SvgIconGauge = 'icons/icon_reader_feedback_gauge.svg';
const SvgIconGavel = 'icons/icon_reader_feedback_gavel.svg';
const SvgIconGun = 'icons/icon_reader_feedback_gun.svg';
const SvgIconGunGirl = 'icons/icon_reader_feedback_gungirl.svg';
const SvgIconHalo = 'icons/icon_reader_feedback_halo.svg';
const SvgIconHandcuffs = 'icons/icon_reader_feedback_handcuffs.svg';
const SvgIconHandCuffs2 = 'icons/icon_reader_feedback_handcuffs2.svg';
const SvgIconHandLoser = 'icons/icon_reader_feedback_hand_loser.svg';
const SvgIconHandsClasped = 'icons/icon_reader_feedback_hands_clasped.svg';
const SvgIconHeartBitten = 'icons/icon_reader_feedback_heart_bitten.svg';
const SvgIconHeartBra = 'icons/icon_reader_feedback_heart_bra.svg';
const SvgIconHeartBroken = 'icons/icon_reader_feedback_heart_broken.svg';
const SvgIconHeartChained = 'icons/icon_reader_feedback_heart_chained.svg';
const SvgIconHeartDotted = 'icons/icon_reader_feedback_heart_dotted.svg';
const SvgIconHeartFeels = 'icons/icon_reader_feedback_heart_feels.svg';
const SvgIconHeartShock = 'icons/icon_reader_feedback_heart_shock.svg';
const SvgIconHelp = 'icons/icon_reader_feedback_help.svg';
const SvgIconHighlight = 'icons/icon_reader_feedback_highlight.svg';
const SvgIconHome = 'icons/icon_reader_tabBar_ipad-ampersand.svg';
const SvgIconHorrified = 'icons/icon_reader_feedback_horrified.svg';
const SvgIconHuh = 'icons/icon_reader_feedback_huh.svg';
const SvgIconInkBlot = 'icons/icon_reader_feedback_ink_blot.svg';
const SvgIconKite = 'icons/icon_reader_feedback_kite.svg';
const SvgIconLaugh = 'icons/icon_reader_feedback_laugh.svg';
const SvgIconLibrary = 'icons/icon_reader_tabBar_ipad-library.svg';
const SvgIconLightbulb = 'icons/icon_reader_feedback_lightbulb.svg';
const SvgIconLike = 'icons/icon_reader_feedback_like.svg';
const SvgIconLipsSmirk = 'icons/icon_reader_feedback_lips_smirk.svg';
const SvgIconLipsTalk = 'icons/icon_reader_feedback_lipsTalk.svg';
const SvgIconLogout = 'icons/icon_reader_feedback_logout.svg';
const SvgIconLove = 'icons/icon_reader_feedback_love.svg';
const SvgIconMagicWand = 'icons/icon_reader_feedback_magicwand.svg';
const SvgIconMailbox = 'icons/icon_reader_feedback_mailbox.svg';
const SvgIconMask = 'icons/icon_reader_feedback_mask.svg';
const SvgIconMegaphone = 'icons/icon_reader_feedback_megaphone.svg';
const SvgIconMen = 'icons/icon_reader_feedback_men.svg';
const SvgIconMicrophone = 'icons/icon_reader_feedback_microphone.svg';
const SvgIconMissingMan = 'icons/icon_reader_feedback_missingman.svg';
const SvgIconMissingWoman = 'icons/icon_reader_feedback_missingwoman.svg';
const SvgIconMore = 'icons/icon_reader_feedback_more.svg';
const SvgIconMoreBurger = 'icons/icon_reader_more_burger.svg';
const SvgIconMoriNote = 'icons/icon_texttools_morinote.svg';
const SvgIconMovieClacker = 'icons/icon_reader_feedback_movieclacker.svg';
const SvgIconMystery = 'icons/icon_reader_feedback_mystery.svg';
const SvgIconNeither = 'icons/icon_reader_feedback_neither.svg';
const SvgIconNewsboyCap = 'icons/icon_reader_feedback_newsboyCap.svg';
const SvgIconNot = 'icons/icon_reader_feedback_not.svg';
const SvgIconNote = 'icons/icon_reader_feedback_note.svg';
const SvgIconNotebook = 'icons/journal.svg';
const SvgIconNotEqual = 'icons/icon_reader_feedback_not_equal.svg';
const SvgIconOffTrack = 'icons/icon_reader_feedback_offtrack.svg';
const SvgIconOops = 'icons/icon_reader_feedback_oops.svg';
const SvgIconPalm = 'icons/icon_reader_feedback_palm.svg';
const SvgIconPanda = 'icons/icon_reader_feedback_panda.svg';
const SvgIconPentagram = 'icons/icon_reader_feedback_pentagram.svg';
const SvgIconPeople = 'icons/icon_reader_feedback_people.svg';
const SvgIconPill = 'icons/icon_reader_feedback_pill.svg';
const SvgIconPin = 'icons/icon_reader_feedback_pin_solid.svg';
const SvgIconPitchfork = 'icons/icon_reader_feedback_pitchfork.svg';
const SvgIconPlot = 'icons/icon_reader_feedback_plot.svg';
const SvgIconPlus = 'icons/icon_plus.svg';
const SvgIconPlusThin = 'icons/icon_plus_28x28.svg';
const SvgIconPoop = 'icons/icon_reader_feedback_poop.svg';
const SvgIconPopcorn = 'icons/icon_reader_feedback_popcorn.svg';
const SvgIconPow = 'icons/icon_reader_feedback_powburst.svg';
const SvgIconPumps = 'icons/icon_reader_feedback_pumpshoe.svg';
const SvgIconPuzzle = 'icons/icon_reader_feedback_puzzle.svg';
const SvgIconQuestionMan = 'icons/icon_reader_feedback_questionMan.svg';
const SvgIconQuestionmark = 'icons/icon_reader_feedback_questionmark.svg';
const SvgIconRabbit = 'icons/icon_reader_feedback_rabbit.svg';
const SvgIconReaderSettings = 'icons/icon_settings.svg';
const SvgIconReaderTray = 'icons/icon_reader_settings.svg';
const SvgIconRollerCoaster = 'icons/icon_reader_feedback_rollerCoaster.svg';
const SvgIconSad = 'icons/icon_reader_feedback_sad.svg';
const SvgIconSaturn = 'icons/icon_reader_feedback_saturn.svg';
const SvgIconScales = 'icons/icon_reader_feedback_scales.svg';
const SvgIconScissors = 'icons/icon_reader_feedback_scissors.svg';
const SvgIconScrabbleTile = 'icons/icon_reader_feedback_scrabbleTile.svg';
const SvgIconSettings = 'icons/icon_reader_feedback_settings.svg';
const SvgIconSettingsNoBg = 'icons/Settings.svg';
const SvgIconShadowMonster = 'icons/icon_reader_feedback_shadowMonster.svg';
const SvgIconShake = 'icons/icon_reader_feedback_shake_2.svg';
const SvgIconSnail = 'icons/icon_reader_feedback_snail.svg';
const SvgIconStackOfPapers = 'icons/icon_reader_feedback_stackofpapers.svg';
const SvgIconStar = 'icons/icon_reader_feedback_star.svg';
const SvgIconStormCloud = 'icons/icon_reader_feedback_stormcloud.svg';
const SvgIconStormTrooper = 'icons/icon_reader_feedback_stormtrooper.svg';
const SvgIconStrikethroughA = 'icons/icon_reader_feedback_strikethrough_a.svg';
const SvgIconSun = 'icons/icon_reader_feedback_sun.svg';
const SvgIconSwoon = 'icons/icon_reader_feedback_swoon.svg';
const SvgIconTarget = 'icons/icon_reader_feedback_target.svg';
const SvgIconTargetWithArrow = 'icons/icon_reader_feedback_target_plus_arrow.svg';
const SvgIconTaxidermy = 'icons/icon_reader_feedback_taxidermy.svg';
const SvgIconThinX = 'icons/icon_x_thin_21x21.svg';
const SvgIconThoughtQuestion = 'icons/icon_reader_feedback_thoughtquestion.svg';
const SvgIconToc = 'icons/TOC.svg';
const SvgIconToeShoes = 'icons/icon_reader_feedback_toeshoes.svg';
const SvgIconTos = 'icons/icon_reader_feedback_tos.svg';
const SvgIconWaveform = 'icons/icon_reader_feedback_waveform.svg';
const SvgIconWho = 'icons/icon_reader_feedback_who.svg';
const SvgIconWillow = 'icons/icon_reader_feedback_willow.svg';
const SvgIconWindowBlowing = 'icons/icon_reader_feedback_window_blowing.svg';
const SvgIconWorried = 'icons/icon_reader_feedback_worried.svg';
const SvgIconWow = 'icons/icon_reader_feedback_wow.svg';
const SvgIconWTF = 'icons/icon_reader_feedback_thought_wtf.svg';
const SvgIconYay = 'icons/icon_reader_feedback_yay.svg';
const SvgJournalClose = 'icons/icon_delete.svg';
const SvgJournalSort = 'icons/icon_journal-sort.svg';
const SvgLandingCollector = 'icons/icon_reader_librarybook.svg';
const SvgLandingReader = 'icons/QuizIcon-Reader.svg';
const SvgLandingWriter = 'icons/QuizIcon-Writer.svg';
const SvgLayerIcon = 'icons/icon_reader_layers_11x9.svg';
const SvgPageDown = 'icons/pageDown.svg';
const SvgPageUp = 'icons/pageUp.svg';
const SvgReaderFeedbackAt = 'icons/icon_reader_feedback_at.svg';
const SvgReaderFeedbackHash = 'icons/icon_reader_feedback_hash.svg';
const SvgReaderFeedbackHighlight = 'icons/icon_reader_feedback_highlight_2.svg';
const SvgReaderFeedbackMoriMark = 'icons/icon_reader_feedback_morimark.svg';
const SvgReaderFeedbackNote = 'icons/icon_reader_feedback_note_2.svg';
const SvgReaderTocArrow = 'icons/icon_reader_toc_arrow.svg';
const SvgSearch = 'icons/icon_writer_home_search.svg';
const SvgSignupBinoculars = 'icons/Signup_SurveyIcons-binoculars.svg';
const SvgSignupBunny = 'icons/Signup_SurveyIcons-bunny.svg';
const SvgSignupBus = 'icons/Signup_SurveyIcons-bus.svg';
const SvgSignupChilling = 'icons/Signup_SurveyIcons-chilling.svg';
const SvgSignupCleaning = 'icons/Signup_SurveyIcons-cleaning.svg';
const SvgSignupEat = 'icons/Signup_SurveyIcons-eat.svg';
const SvgSignupExercise = 'icons/Signup_SurveyIcons-exercise.svg';
const SvgSignupFamily = 'icons/Signup_SurveyIcons-family.svg';
const SvgSignupGift = 'icons/Signup_SurveyIcons-gift.svg';
const SvgSignupGolfcap = 'icons/Signup_SurveyIcons-golfcap.svg';
const SvgSignupHappy = 'icons/Signup_SurveyIcons-happy.svg';
const SvgSignupHappyDude = 'icons/Signup_SurveyIcons-happy-dude.svg';
const SvgSignupHarrypotter = 'icons/Signup_SurveyIcons-harrypotter.svg';
const SvgSignupHeart = 'icons/Signup_SurveyIcons-heart.svg';
const SvgSignupHourglass = 'icons/Signup_SurveyIcons-hourglass.svg';
const SvgSignupID = 'icons/Signup_SurveyIcons-id.svg';
const SvgSignupLine = 'icons/Signup_SurveyIcons-line.svg';
const SvgSignupLoo = 'icons/Signup_SurveyIcons-loo.svg';
const SvgSignupMovie = 'icons/SurveyIcon_MovieReel.svg';
const SvgSignupPen = 'icons/Signup_SurveyIcons-pen.svg';
const SvgSignupPen2 = 'icons/Signup_SurveyIcons-pen2.svg';
const SvgSignupPeople = 'icons/Signup_SurveyIcons-people.svg';
const SvgSignupPlane = 'icons/Signup_SurveyIcons-plane.svg';
const SvgSignupReading = 'icons/Signup_SurveyIcons-reading.svg';
const SvgSignupSequel = 'icons/Signup_SurveyIcons-sequel.svg';
const SvgSignupSleeping = 'icons/Signup_SurveyIcons-sleeping.svg';
const SvgSignupStethascope = 'icons/Signup_SurveyIcons-stethascope.svg';
const SvgSignupSunrise = 'icons/Signup_SurveyIcons-sunrise.svg';
const SvgSignupTalking = 'icons/Signup_SurveyIcons-talking.svg';
const SvgSignupThumb = 'icons/Signup_SurveyIcons-thumb.svg';
const SvgSignupVacation = 'icons/Signup_SurveyIcons-vacation.svg';
const SvgSignupWriting = 'icons/Signup_SurveyIcons-writing.svg';
const SvgSignupZs = 'icons/Signup_SurveyIcons-zs.svg';
const SvgTextToolsHighlight = 'icons/icon_texttools_highlight.svg';
const SvgTocReader = 'icons/icon_reader_toc-minigray.svg';

const iconLookUp = {
  thinPlus: SvgIconPlusThin,
  readerSearchJournal: SvgSearch,
  journalSort: SvgJournalSort,
  darkEllipsis: SvgDarkEllipsis,
  journalClose: SvgJournalClose,
  readerMoriMark: SvgReaderFeedbackMoriMark,
  readerFeedbackHash: SvgReaderFeedbackHash,
  readerFeedbackAt: SvgReaderFeedbackAt,
  readerFeedbackNote: SvgReaderFeedbackNote,
  readerFeedbackHighlight: SvgReaderFeedbackHighlight,
  account: SvgIconAccount,
  addFriend: SvgIconAddFriend,
  ampersandLogo: SvgAmpersandLogo,
  ampersandLogoNameBelow: SvgAmpersandLogoNameBelow,
  angel: SvgIconAngel,
  ballpointPenPaper: SvgIconBallpointPenPaper,
  bookMagifier: SvgIconBookMagnifier,
  bored: SvgIconBored,
  boredz: SvgIconBoredZ,
  brain: SvgIconBrain,
  c3po: SvgIconC3PO,
  catalog: SvgIconCatalog,
  chat: SvgIconChat,
  checkmark: SvgIconCheckmark,
  chemistry: SvgIconChemistry,
  chevronL: SvgIconChevronL,
  chevronR: SvgIconChevronR,
  clapping: SvgIconClapping,
  cloudRain: SvgIconCloudRain,
  crystal: SvgIconCrystal,
  confused: SvgIconConfused,
  curiousCat: SvgIconCuriousCat,
  daggers: SvgIconDaggers,
  danger: SvgIconDanger,
  dated: SvgIconDated,
  dated2: SvgIconDated2,
  deathstar: SvgIconDeathStar,
  devil: SvgIconDevil,
  dislike: SvgIconDislike,
  doubleChevronLeft: SvgIconDoubleChevronLeft,
  doubleChevronRight: SvgIconDoubleChevronRight,
  dramaMasks: SvgIconDramaMasks,
  earth: SvgIconEarth,
  engaging: SvgIconEngaging,
  eyeFemale: SvgIconEyeFemale,
  factcheck: SvgIconFactcheck,
  featherPen: SvgIconFeatherPen,
  fedora: SvgIconFedora,
  feedback: SvgIconFeedback,
  female: SvgIconFemale,
  firefly: SvgIconFirefly,
  fistBump: SvgIconFistBump,
  flag: SvgIconFlag,
  flower: SvgIconFlower,
  frown: SvgIconFrown,
  frustrated: SvgIconFrustrated,
  gamePlan: SvgIconGamePlan,
  gauge: SvgIconGauge,
  gavel: SvgIconGavel,
  gun: SvgIconGun,
  gunGirl: SvgIconGunGirl,
  halo: SvgIconHalo,
  handcuffs2: SvgIconHandCuffs2,
  handcuffs: SvgIconHandcuffs,
  handLoser: SvgIconHandLoser,
  handsClasped: SvgIconHandsClasped,
  heartBitten: SvgIconHeartBitten,
  heartBra: SvgIconHeartBra,
  heartBroken: SvgIconHeartBroken,
  heartChained: SvgIconHeartChained,
  heartDotted: SvgIconHeartDotted,
  heartFeels: SvgIconHeartFeels,
  heartShock: SvgIconHeartShock,
  help: SvgIconHelp,
  highlight: SvgIconHighlight,
  highlighter: SvgTextToolsHighlight,
  home: SvgIconHome,
  horrified: SvgIconHorrified,
  huh: SvgIconHuh,
  inkBlot: SvgIconInkBlot,
  kite: SvgIconKite,
  laugh: SvgIconLaugh,
  library: SvgIconLibrary,
  lightBulb: SvgIconLightbulb,
  like: SvgIconLike,
  lipsSmirk: SvgIconLipsSmirk,
  lipsTalk: SvgIconLipsTalk,
  logout: SvgIconLogout,
  love: SvgIconLove,
  magicWand: SvgIconMagicWand,
  mailbox: SvgIconMailbox,
  mask: SvgIconMask,
  megaphone: SvgIconMegaphone,
  men: SvgIconMen,
  microphone: SvgIconMicrophone,
  missingMan: SvgIconMissingMan,
  missingWoman: SvgIconMissingWoman,
  more: SvgIconMore,
  moreBurger: SvgIconMoreBurger,
  moriNote: SvgIconMoriNote,
  movieClacker: SvgIconMovieClacker,
  mystery: SvgIconMystery,
  neither: SvgIconNeither,
  newsboyCap: SvgIconNewsboyCap,
  noIcon: SvgIconThinX,
  not: SvgIconNot,
  note: SvgIconNote,
  notebook: SvgIconNotebook,
  notEqual: SvgIconNotEqual,
  offtrack: SvgIconOffTrack,
  oops: SvgIconOops,
  palm: SvgIconPalm,
  panda: SvgIconPanda,
  pentagram: SvgIconPentagram,
  people: SvgIconPeople,
  pill: SvgIconPill,
  pin: SvgIconPin,
  pitchfork: SvgIconPitchfork,
  plot: SvgIconPlot,
  plus: SvgIconPlus,
  poop: SvgIconPoop,
  popcorn: SvgIconPopcorn,
  pow: SvgIconPow,
  pumps: SvgIconPumps,
  puzzle: SvgIconPuzzle,
  questionMan: SvgIconQuestionMan,
  questionMark: SvgIconQuestionmark,
  rabbit: SvgIconRabbit,
  readerTrayIcon: SvgIconReaderTray,
  rollerCoaster: SvgIconRollerCoaster,
  sad: SvgIconSad,
  saturn: SvgIconSaturn,
  scales: SvgIconScales,
  scissors: SvgIconScissors,
  scrabbleTile: SvgIconScrabbleTile,
  settings: SvgIconSettings,
  settingsNoBg: SvgIconSettingsNoBg,
  shadowMonster: SvgIconShadowMonster,
  shake: SvgIconShake,
  snail: SvgIconSnail,
  stackOfPapers: SvgIconStackOfPapers,
  star: SvgIconStar,
  stormCloud: SvgIconStormCloud,
  stormtrooper: SvgIconStormTrooper,
  strikethroughA: SvgIconStrikethroughA,
  sun: SvgIconSun,
  swoon: SvgIconSwoon,
  target: SvgIconTarget,
  targetWithArrow: SvgIconTargetWithArrow,
  taxidermy: SvgIconTaxidermy,
  thinX: SvgIconThinX,
  thoughtQuestion: SvgIconThoughtQuestion,
  toc: SvgIconToc,
  tocArrow: SvgReaderTocArrow,
  toeShoes: SvgIconToeShoes,
  tos: SvgIconTos,
  waveform: SvgIconWaveform,
  who: SvgIconWho,
  willow: SvgIconWillow,
  windowBlowing: SvgIconWindowBlowing,
  worried: SvgIconWorried,
  wow: SvgIconWow,
  wtf: SvgIconWTF,
  yay: SvgIconYay,
  SUbinoculars: SvgSignupBinoculars,
  SUbunny: SvgSignupBunny,
  SUbus: SvgSignupBus,
  SUchilling: SvgSignupChilling,
  SUcleaning: SvgSignupCleaning,
  SUeat: SvgSignupEat,
  SUexercise: SvgSignupExercise,
  SUfamily: SvgSignupFamily,
  SUgift: SvgSignupGift,
  SUgolfcap: SvgSignupGolfcap,
  SUhappydude: SvgSignupHappyDude,
  SUhappy: SvgSignupHappy,
  SUharrypotter: SvgSignupHarrypotter,
  SUheart: SvgSignupHeart,
  SUhourglass: SvgSignupHourglass,
  SUid: SvgSignupID,
  SUline: SvgSignupLine,
  SUloo: SvgSignupLoo,
  SUmovie: SvgSignupMovie,
  SUpen: SvgSignupPen,
  SUpen2: SvgSignupPen2,
  SUpeople: SvgSignupPeople,
  SUplane: SvgSignupPlane,
  SUreading: SvgSignupReading,
  SUsequel: SvgSignupSequel,
  SUsleeping: SvgSignupSleeping,
  SUstethascope: SvgSignupStethascope,
  SUsunrise: SvgSignupSunrise,
  SUtalking: SvgSignupTalking,
  SUthumb: SvgSignupThumb,
  SUvacation: SvgSignupVacation,
  SUwriting: SvgSignupWriting,
  SUzs: SvgSignupZs,
  LandingCollector: SvgLandingCollector,
  LandingReader: SvgLandingReader,
  LandingWriter: SvgLandingWriter,
  SvgChevronLeft: SvgChevronLeft,
  store: SvgChannelStore,
  info: SvgChannelInfo,
  layers: SvgLayerIcon,
  pageUp: SvgPageUp,
  pageDown: SvgPageDown,
  readerSettings: SvgIconReaderSettings,
  fontLarger: SvgFontLarger,
  fontSmaller: SvgFontSmaller,
  tocReader: SvgTocReader,
};

export function getIcon(name, returnUndefined?) {
  if (Util.startsWith(name, 'icons/')) {
    return name;
  }
  if (iconLookUp[name] === undefined) {
    if (returnUndefined) {
      return undefined;
    }
    return iconLookUp.noIcon;
  }
  return iconLookUp[name];
}


