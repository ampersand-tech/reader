/**
* Copyright 2018-present Ampersand Technologies, Inc.
*
*/

import { FONT_TABLE } from 'clientjs/components/CanvasReader/ReaderStyle';
import * as StyledQuote from 'clientjs/components/StyledQuote';
import * as IpcClientUtil from 'clientjs/ipcClientUtil';
import * as QuotesDB from 'clientjs/shared/quotesDB';
import * as Util from 'overlib/client/clientUtil';
import { absurd } from 'overlib/client/clientUtil';
import { DataWatcher } from 'overlib/client/components/DataWatcher';
import * as Flex from 'overlib/client/components/Flex.tsx';
import { CanvasLayoutRenderer } from 'overlib/client/components/Layout/CanvasLayoutRenderer';
import * as LayoutDrawable from 'overlib/client/components/Layout/LayoutDrawable';
import { LoadingIndicator } from 'overlib/client/components/LoadingIndicator';
import { Slider } from 'overlib/client/components/Slider.tsx';
import { SvgIcon } from 'overlib/client/components/SvgIcon';
import { UnstyledButton } from 'overlib/client/components/UnstyledButton';
import * as Content from 'overlib/client/content';
import * as Log from 'overlib/client/log';
import * as Navigation from 'overlib/client/navigation';
import * as Sketch from 'overlib/shared/sketch';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

type ToolID = 'typeface' | 'align' | 'background' | 'textSize';
const TOOLS: ToolID[] = ['typeface', 'align', 'background', 'textSize'];

const TOOL_ICONS = {
  typeface: 'icons/icon_reader_settings.svg',
  align: 'icons/icon_texttools_justifyfull.svg',
  background: 'icons/icon_tabbar_picturephoto-edit.svg',
  textSize: 'icons/icon_journal-sort.svg',
};

type FontID = 'Raleway' | 'Noto Serif' | 'Montserrat' | 'PT Serif';
const FONTS: FontID[] = ['Raleway', 'Noto Serif', 'Montserrat', 'PT Serif'];

type Align = 'left' | 'center' | 'right';
const ALIGNS: Align[] = ['left', 'center', 'right'];

const ALIGN_ICONS = {
  left: 'icons/icon_texttools_justify_left.svg',
  center: 'icons/icon_texttools_justify_center.svg',
  right: 'icons/icon_texttools_justify_right.svg',
};

interface Background {
  backgroundImage: string;
  color: string;
}

const BACKGROUNDS: Background[] = [
  // { color: '#e5e6e8', backgroundImage: 'linear-gradient(131deg, #63a1ff 0%, #4f64b3 62%, #300842 100%)' },
  // { color: '#e5e6e8', backgroundImage: 'linear-gradient(0deg, #fad961 0%, #f76b1c 100%)' },
  // { color: '#e5e6e8', backgroundImage: 'linear-gradient(137deg, #b4ec51 0%, #429321 100%)' },
  // { color: '#e5e6e8', backgroundImage: 'linear-gradient(135deg, #3023ae 0%, #c86dd7 100%)' },
  // { color: '#e5e6e8', backgroundImage: 'linear-gradient(135deg, #3023ae 0%, #53a0fd 48%, #b4ec51 100%)' },
  // { color: '#e5e6e8', backgroundImage: 'linear-gradient(0deg, #f5515f 0%, #9f041b 100%)' },
  // { color: '#e5e6e8', backgroundImage: 'linear-gradient(90deg, #3023ae 0%, #53a0fd 48%, #b4ec51 100%)' },

  { color: '#e5e6e8', backgroundImage: 'linear-gradient(135deg, #3023ae 0%, #c86dd7 100%)'},
  { color: '#e5e6e8', backgroundImage: 'linear-gradient(  0deg, #f5515f 0%, #9f041b 100%)'},
  { color: '#e5e6e8', backgroundImage: 'linear-gradient(134deg, #63a1ff 0%, #4f64b3 62%, #300842 100%)'},
  { color: 'black',   backgroundImage: 'url(images/quote_bitmap@3x.png)'},
  { color: '#e5e6e8', backgroundImage: 'url(images/quote_bitmap_2@3x.png)'},
  { color: 'black',   backgroundImage: 'url(images/quote_bitmap_3@2x.png)'},
  { color: 'black',   backgroundImage: 'url(images/quote_bitmap_4@2x.png)'},
  { color: 'black',   backgroundImage: 'url(images/quote_bitmap_5@2x.png)'},
];

function cdnify(watcher, background: string): string {
  return background.replace(
    /url\(([^)]+)\)/,
    (_, path: string) => `url(${Content.contentUrl(watcher, path)})`,
  );
}

type TextSize = number;
const MIN_TEXT_SIZE = 8;
const MAX_TEXT_SIZE = 48;
const DEFAULT_TEXT_SIZE = 22;

class FontTool extends React.Component<{selectedFont: FontID, onSelect: (font: FontID) => void}> {
  icon = (font: FontID) => {
    const classes = font === this.props.selectedFont
      ? 'c-iron-bg c-black-fg br-3'
      : 'c-iron-fg'
    ;
    return (
      <div key={font} classes={`ta-c p-x-10 ${classes}`} style={{fontFamily: font}} onClick={this.props.onSelect.bind(null, font)}>
        {font}
      </div>
    );
  }

  render() {
    return (
      <Flex.Row classes='w-100vw m-10 ai-b jc-sa'>
        {FONTS.map(this.icon)}
      </Flex.Row>
    );
  }
}

class AlignTool extends React.Component<{selectedAlign: Align, onSelect: (align: Align) => void}> {
  icon = (align: Align) => {
    const classes = align === this.props.selectedAlign
      ? 'c-smoke-b'
      : 'c-black-b'
    ;
    return (
      <div key={align} classes={`b-1 br-6 w-57 h-57 p-10 ${classes}`} onClick={this.props.onSelect.bind(null, align)}>
        {/* {align} */}
        <SvgIcon svgName={ALIGN_ICONS[align]} classes='c-white-f' />
      </div>
    );
  }

  render() {
    return (
      <Flex.Row classes='w-100vw m-10 jc-sa'>
        {ALIGNS.map(this.icon)}
      </Flex.Row>
    );
  }
}

class BackgroundTool extends DataWatcher<{selectedBackground: Background, onSelect: (background: Background) => void}> {
  index = 0;

  icon = (background: Background) => {
    const c = 'br-90 p-7 b-1';
    const containerClasses = background === this.props.selectedBackground
      ? `${c} c-iron-b`
      : `${c} c-black-b`
    ;
    return (
      <span key={++this.index} classes={containerClasses}>
        <div
          classes={`br-90 w-30 h-30`}
          style={{backgroundImage: cdnify(this, background.backgroundImage), backgroundSize: 'cover'}}
          onClick={this.props.onSelect.bind(null, background)}
          />
      </span>
    );
  }

  render() {
    this.index = 0;
    return (
      <Flex.Row classes='w-100vw p-10 jc-c'>
        {BACKGROUNDS.map(this.icon)}
      </Flex.Row>
    );
  }
}

class TextSizeTool extends React.Component<{selectedSize: TextSize, onSelect: (fontSize: TextSize) => void}> {
  render() {
    const iconClasses = 'w-32 h-32 c-white-f';
    return (
      <Flex.Row classes='w-80vw m-b-10 ai-c'>
        <SvgIcon svgName='icons/icon_reader_size_smaller.svg' classes={iconClasses} />
        <Slider
          classes='fg-1 m-y-10'
          minValue={MIN_TEXT_SIZE}
          maxValue={MAX_TEXT_SIZE}
          value={this.props.selectedSize}
          onChange={this.props.onSelect}
          onProvisionalChange={this.props.onSelect}
          />
        <SvgIcon svgName='icons/icon_reader_size_larger.svg' classes={iconClasses} />
      </Flex.Row>
    );
  }
}

class MainToolbar extends React.Component<{selectedTool: ToolID | null, onSelect: (tool: ToolID) => void}> {
  icon = (tool: ToolID) => {
    return (
      <Flex.Col key={tool} classes='ai-c' onClick={this.props.onSelect.bind(null, tool)}>
        <SvgIcon svgName={TOOL_ICONS[tool]} classes='c-white-f c-white-s w-32 h-32' />
        { (tool === this.props.selectedTool)
          ? <div classes='h-0'>●</div>
          : <div classes='h-0 v-h'>●</div>
        }
      </Flex.Col>
    );
  }

  render() {
    return (
      <Flex.Row classes='jc-sa c-slate-b ai-c b-t-1 p-y-25 w-100vw'>
        {TOOLS.map(this.icon)}
      </Flex.Row>
    );
  }
}

interface Props {
  quote: string; // json
  quoteID?: string;
}

interface State {
  fontsReady: boolean;
  selectedTool: null | ToolID;
  selectedFont: FontID;
  selectedAlign: Align;
  selectedBackground: Background;
  selectedSize: TextSize;

  quoteSaved: boolean;
}

export class ShareQuote extends DataWatcher<Props, State> {
  state: State = {
    fontsReady: false,
    selectedTool: null,
    selectedFont: 'PT Serif',
    selectedAlign: 'center',
    selectedBackground: BACKGROUNDS[0],
    selectedSize: DEFAULT_TEXT_SIZE,

    quoteSaved: false,
  };

  componentWillMount() {
    super.componentWillMount();

    LayoutDrawable.setFontTable(FONT_TABLE, (_font) => {
      this.setState({fontsReady: true});
    });

    const quoteSaved: boolean = !!this.props.quoteID && !!this.getData(['quotes', this.props.quoteID]);
    const parsedQuote: QuotesDB.Quote | null = Util.safeParse(decodeURIComponent(this.props.quote));

    if (parsedQuote) {
      const contentStyle = parsedQuote.contentStyle;
      const containerStyle = parsedQuote.containerStyle;
      const color = (contentStyle && contentStyle.color) || this.state.selectedBackground.color;
      const backgroundImage = (containerStyle && containerStyle.backgroundImage) || this.state.selectedBackground.backgroundImage;

      this.setState({
        selectedFont: (contentStyle && contentStyle.fontFamily as FontID) || this.state.selectedFont,
        selectedAlign: (contentStyle && contentStyle.textAlign as Align) || this.state.selectedAlign,
        selectedSize: (contentStyle && contentStyle.fontSize as TextSize) || this.state.selectedSize,
        selectedBackground: { color, backgroundImage } as Background,
        quoteSaved,
      });
    } else {
      this.setState({ quoteSaved });
    }
  }

  private onClose = () => {
    Navigation.goBack();
  }

  private getQuote(): QuotesDB.Quote|null {
    const parsedQuote: QuotesDB.Quote | null = Util.safeParse(decodeURIComponent(this.props.quote));
    if (!parsedQuote) {
      return null;
    }

    parsedQuote.contentStyle = {
      fontFamily: this.state.selectedFont,
      textAlign: this.state.selectedAlign,
      fontSize: this.state.selectedSize,
      color: this.state.selectedBackground.color,
    };

    parsedQuote.containerStyle = {
      backgroundImage: this.state.selectedBackground.backgroundImage,
    };

    return parsedQuote;
  }

  private onSave = () => {
    Sketch.runAction('quote.save', this.getQuote());
    this.setState({quoteSaved: true});
  }

  private onShare = () => {
    if (!this.canvas) {
      Log.error('@unassigned', 'ShareQuote.noCanvas');
      return;
    }

    const imageData = this.canvas.toDataURL('image/jpeg', 0.55);

    IpcClientUtil.shareImage(imageData, `my_quote ${Util.simpleTimeStr(new Date(), true)}.jpeg`, err => {
      Log.info('@unassigned', 'shareImage.complete', err);
    });
  }

  private selectTool = (selectedTool: ToolID) => {
    this.setState({selectedTool});
  }

  private onSelectFont = (selectedFont: FontID) => {
    this.setState({selectedFont, quoteSaved: false});
  }

  private onSelectAlign = (selectedAlign: Align) => {
    this.setState({selectedAlign, quoteSaved: false});
  }

  private onSelectBackground = (selectedBackground: Background) => {
    this.setState({selectedBackground, quoteSaved: false});
  }

  private onSelectTextSize = (selectedSize: TextSize) => {
    this.setState({selectedSize, quoteSaved: false});
  }

  private canvas: HTMLCanvasElement | null = null;
  private saveCanvas = (c: CanvasLayoutRenderer) =>
    this.canvas = c && ReactDOM.findDOMNode(c) as HTMLCanvasElement

  render() {
    if (!this.state.fontsReady) {
      return <LoadingIndicator />;
    }

    const parsedQuote = this.getQuote();
    if (!parsedQuote) {
      return null;
    }

    const width = 375;
    const height = 337;

    let subTool: JSX.Element | null = null;

    switch (this.state.selectedTool) {
      case 'typeface': {
        subTool = <FontTool selectedFont={this.state.selectedFont} onSelect={this.onSelectFont} />;
        break;
      }
      case 'align': {
        subTool = <AlignTool selectedAlign={this.state.selectedAlign} onSelect={this.onSelectAlign} />;
        break;
      }
      case 'background': {
        subTool = <BackgroundTool selectedBackground={this.state.selectedBackground} onSelect={this.onSelectBackground} />;
        break;
      }
      case 'textSize': {
        subTool = <TextSizeTool selectedSize={this.state.selectedSize} onSelect={this.onSelectTextSize} />;
        break;
      }
      case null: {
        break;
      }
      default:
        absurd(this.state.selectedTool);
    }

    return (
      <Flex.Col classes='c-black-bg ai-c fg-1'>
        <SvgIcon classes='as-fe c-white-f m-16 w-20 h-20' svgName='icons/icon_groups_x.svg' onClick={this.onClose} />
        <CanvasLayoutRenderer ref={this.saveCanvas} classes={`w-${width} h-${height}`}>
          <StyledQuote.StyledQuote quote={parsedQuote} width={width} />
        </CanvasLayoutRenderer>
        { this.state.quoteSaved
        ? [
          <SvgIcon key='a' svgName='icons/icon_checkmark.svg' classes='p-2 w-23 h-23 c-black-f c-white-bg br-25 m-y-18' />,
          <Flex.Row key='b' classes='m-b-18'>Your quote has been saved to your library.</Flex.Row>,
          <UnstyledButton key='c' classes='tt-u c-black-bg c-white-fg br-30 b-1 c-white-b p-8 w-100' command={this.onShare}>Share</UnstyledButton>,

        ]
        : [
          <Flex.Row key='1' classes='h-35' />,
          <UnstyledButton key='2' classes='tt-u c-black-bg c-white-fg br-30 b-1 c-white-b p-8 w-100' command={this.onSave}>Save</UnstyledButton>,
        ]}
        <Flex.Row classes='fg-1' />
        {subTool}
        <MainToolbar selectedTool={this.state.selectedTool} onSelect={this.selectTool} />
      </Flex.Col>
    );
  }
}
