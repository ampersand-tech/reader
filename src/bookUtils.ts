/**
 * Copyright 2014-present Ampersand Technologies, Inc.
 *
 */
/* eslint-disable no-shadow */


/*

writer internal format:

paragraphs:[{content:'', modifiers:[{start:start,end:end,type:type},...]},...]

writer dom format:

<div class='{type}'>
  {contents}
</div>

{type} =
  paragraph
  quote
  list

{contents} =
  text
  <b>{contents}</b>
  <i>{contents}</i>
  <u>{contents}</u>
  <h1>{contents}</h1>
  <h2>{contents}</h2>
  <h3>{contents}</h3>
  <sup>{contents}</sup>
  <sub>{contents}</sub>
  <li>{contents}</li>
  <span class='tar|tag|taj|tag|spl'>{contents}</span>
*/

import * as Paragraph from 'clientjs/shared/paragraph';
import { isTCModifier } from 'clientjs/shared/paragraph';
import { Modifiers, WidgetTypes } from 'clientjs/shared/paragraphTypes';
import * as Log from 'overlib/shared/logCommon';
import * as Util from 'overlib/shared/util';

const whiteList = Util.arrayToObj(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'SPAN',
  'BLOCKQUOTE', 'P', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'SUP', 'SUB', 'UL', 'OL', 'LI', 'BR', 'IMG', 'A']);
const blackList = Util.arrayToObj(['STYLE', 'META', 'SCRIPT', 'TITLE']);

function isHTMLElement(n: Node): n is HTMLElement {
  return n.nodeType === Node.ELEMENT_NODE;
}

function isTextNode(n: Node): n is Text {
  return n.nodeType === Node.TEXT_NODE;
}

function isHTMLAnchor(n: Node): n is HTMLAnchorElement {
  return n.nodeName === 'A';
}


export function getParagraphsFromPlainText(textIn: string) {
  const text = textIn.split(/\r?\n|\r/);
  const paragraphs: Paragraph.Paragraph[] = [];
  for (let p = 0; p < text.length; p++) {
    paragraphs.push(Paragraph.create(
      undefined, // id
      Paragraph.Types.P, // type
      text[p], // content
    ));
  }
  return paragraphs;
}

function actOnChildren(dom: Node, whitelist, blacklist, preCB, inCB, postCB) {
  if (whitelist[dom.nodeName] || dom.nodeType === 3) {
    if (dom.nodeType === 3) {
      dom.textContent = dom.textContent!.replace(/\r?\n|\r/g, '');
    }
    preCB && preCB(dom);
    inCB && inCB(dom);
  }
  if (!blacklist[dom.nodeName]) {
    const children = dom.childNodes;
    for (let i = 0; i < children.length; i++) {
      actOnChildren(children[i], whitelist, blacklist, preCB, inCB, postCB);
    }
  }
  if (whitelist[dom.nodeName] || dom.nodeType === 3) {
    postCB && postCB(dom);
  }
}

interface BlockMod {
  type: string;
  start: number;
  end: number;
}

export function paragraphsFromDom(element: Node) {
  const paragraphs: Paragraph.Paragraph[] = [];
  let textOffset = 0;
  let p;
  actOnChildren(element, whiteList, blackList,
    // preCB
    function(c) {
      const nodeName = c.nodeName;
      let blockMods: BlockMod[] = [];
      if (c.style) {
        switch (c.style.textAlign) {
          case 'left':
            break;
          case 'right':
            blockMods = [{type: 'tar', start: -1, end: -1}];
            break;
          case 'center':
            blockMods = [{type: 'tac', start: -1, end: -1}];
            break;
          case 'justify':
            blockMods = [{type: 'taj', start: -1, end: -1}];
            break;
        }
      }
      // these node's will always create a new paragraph
      switch (nodeName) {
        case 'H1':
        case 'H2':
        case 'H3':
        case 'H4':
        case 'H5':
        case 'H6':
          p = Paragraph.createShort(Paragraph.Types[nodeName]);
          p.modifiers = blockMods;
          break;
        case 'BLOCKQUOTE':
          p = Paragraph.createShort(Paragraph.Types.P);
          p.modifiers = blockMods;
          break;
        case 'LI_DEPRECATED':
          p = Paragraph.createShort(Paragraph.Types.LI_DEPRECATED);
          p.modifiers = blockMods;
          break;
        case 'DIV':
        case 'P':
          if (c.className.indexOf(' title ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.TITLE);
          } else if (c.className.indexOf(' h1 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.TITLE);
          } else if (c.className.indexOf(' section ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.SECTION);
          } else if (c.className.indexOf(' h2 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.SECTION);
          } else if (c.className.indexOf(' chapter ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.CHAPTER);
          } else if (c.className.indexOf(' h3 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.CHAPTER);
          } else if (c.className.indexOf(' scene ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.SCENE);
          } else if (c.className.indexOf(' h4 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.SCENE);
          } else if (c.className.indexOf(' h5 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.SCENE);
          } else if (c.className.indexOf(' h6 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.SCENE);
          } else if (c.className.indexOf(' quote ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.P);
            Paragraph.addModifier(p, Modifiers.TAC, -1, -1);
          } else if (c.className.indexOf(' MsoBlockText ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.P);
            Paragraph.addModifier(p, Modifiers.TAC, -1, -1);
          } else if (c.className.indexOf(' MsoTitle') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.TITLE);
          } else if (c.className.indexOf(' list1') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.LI_DEPRECATED);
          } else if (c.className.indexOf(' list2 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.LI_DEPRECATED);
            p.tabLevel = 2;
          } else if (c.className.indexOf(' list3 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.LI_DEPRECATED);
            p.tabLevel = 3;
          } else if (c.className.indexOf(' list4 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.LI_DEPRECATED);
            p.tabLevel = 4;
          } else if (c.className.indexOf(' list5 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.LI_DEPRECATED);
            p.tabLevel = 5;
          } else if (c.className.indexOf(' list6 ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.LI_DEPRECATED);
            p.tabLevel = 6;
          } else if (c.className.indexOf(' list ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.LI_DEPRECATED);
          } else if (c.className.indexOf(' comment ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.COMMENT_DEPRECATED);
          } else if (c.className.indexOf(' imgPlaceholder ') !== -1) {
            const url = c.className.substr(' imgPlaceholder '.length);
            Paragraph.addText(p, ' ', undefined);
            Paragraph.addModifier(p, Modifiers.WIDGET, textOffset, textOffset + 1, {widget: WidgetTypes.IMG, url: url});
            textOffset += 1;
          } else if (c.className.indexOf(' paragraph ') !== -1) {
            p = Paragraph.createShort(Paragraph.Types.P);
            let number = c.className.match(/TAB(\d)/);
            if (number && number[1]) {
              p.tabLevel = parseInt(number[1]);
            }
            const idx = c.className.indexOf(' BULLET ');
            if (idx !== -1) {
              Paragraph.addModifier(p, Modifiers.BULLET, -1, -1);
            } else {
              number = c.className.match(/NUMBER(\d+)/);
              if (number && number[1]) {
                Paragraph.addModifier(p, Modifiers.NUMBER, -1, -1, parseInt(number[1]));
              }
            }
          } else {
            if (c.id) {
              p = Paragraph.createShort(Paragraph.Types.P);
            }
          }
          if (p) {
            for (let i = 0; i < blockMods.length; i++) {
              p.modifiers.push(blockMods[i]);
            }
          }
          break;
      }
      // these node's will only create a new paragraph if one doesn't exist
      if (!p) {
        switch (nodeName) {
          case 'IMG':
          case 'B':
          case 'STRONG':
          case 'I':
          case 'EM':
          case 'U':
          case 'S':
          case 'SUP':
          case 'SUB':
          case 'BR':
          case 'SPAN':
          case 'A':
            p = Paragraph.createShort(Paragraph.Types.P);
            break;
          case '#text':
            if (c.textContent.length && c.textContent.indexOf('<!--') === -1) {
              p = Paragraph.createShort(Paragraph.Types.P);
            }
            break;
        }
      }
    },
    // inCB
    function(c) {
      const nodeName = c.nodeName;
      switch (nodeName) {
        case 'IMG':
          Paragraph.addText(p, ' ', undefined);
          Paragraph.addModifier(p, Modifiers.WIDGET, textOffset, textOffset + 1, {widget: WidgetTypes.IMG, url: c.src});
          textOffset += 1;
          break;
        case 'B':
        case 'STRONG':
        case 'I':
        case 'EM':
        case 'U':
        case 'S':
        case 'SUP':
        case 'SUB':
          Paragraph.addModifier(p, Modifiers[nodeName], textOffset, textOffset + c.textContent.length);
          break;
        case 'SPAN': // make sure we can cut and paste to ourselves
          if (c.className.indexOf(' tagComment ') !== -1) {
            const match = / tagComment {2}({[^}]*})/g.exec(c.className.slice(c.className.indexOf(' tagComment ')));

            if (match) {
              Paragraph.addModifier(p, Modifiers.TAGCOMMENT, textOffset, textOffset + c.textContent.length, Util.safeParse(match[1]));
            }
          } else if (c.className.indexOf(' spl ') !== -1) {
            Paragraph.addModifier(p, Modifiers.SPL, textOffset, textOffset + c.textContent.length);
          } else if (c.className.indexOf(' i ') !== -1) {
            Paragraph.addModifier(p, Modifiers.I, textOffset, textOffset + c.textContent.length);
          } else if (c.className.indexOf(' sub ') !== -1) {
            Paragraph.addModifier(p, Modifiers.SUB, textOffset, textOffset + c.textContent.length);
          } else if (c.className.indexOf(' sup ') !== -1) {
            Paragraph.addModifier(p, Modifiers.SUP, textOffset, textOffset + c.textContent.length);
          } else if (c.className.indexOf(' u ') !== -1) {
            Paragraph.addModifier(p, Modifiers.U, textOffset, textOffset + c.textContent.length);
          } else if (c.className.indexOf(' s ') !== -1) {
            Paragraph.addModifier(p, Modifiers.S, textOffset, textOffset + c.textContent.length);
          } else if (c.className.indexOf(' b ') !== -1) {
            Paragraph.addModifier(p, Modifiers.S, textOffset, textOffset + c.textContent.length);
          } else if (c.className.indexOf(' h1 ') !== -1) {
            p.type = Paragraph.Types.SECTION;
          } else if (c.className.indexOf(' h2 ') !== -1) {
            p.type = Paragraph.Types.CHAPTER;
          } else if (c.className.indexOf(' h3 ') !== -1) {
            p.type = Paragraph.Types.SCENE;
          }
          break;
        case '#text':
          const text = c.textContent;
          if (text.length && text.indexOf('<!--') === -1) {
            // only add #text nodes that are part of a paragraph
            Paragraph.addText(p, text, undefined);
            textOffset += text.length;
          }
          break;
      }
    },
    // postCB
    function(c) {
      let nodeName = c.nodeName;
      if (!p && nodeName === 'SPAN' && c.style.fontSize) { // cheat the type for cut and paste that only grabs a span
        const fontSize = c.style.fontSize.substr(0, c.style.fontSize.length - 2); // pull off px
        if (fontSize >= 42) {
          nodeName = 'H1';
        } else if (fontSize >= 32) {
          nodeName = 'H2';
        } else if (fontSize >= 21) {
          nodeName = 'H3';
        }
      }

      // nodes that close off old paragraphs
      switch (nodeName) {
        case 'H1':
        case 'H2':
        case 'H3':
        case 'H4':
        case 'H5':
        case 'H6':
        case 'BLOCKQUOTE':
        case 'LI':
        case 'BR':
        case 'DIV':
        case 'P':
          if (p) {
            paragraphs.push(p);
            p = null;
            textOffset = 0;
          }
          break;
      }
    },
  );
  if (p && p.content.length) {
    paragraphs.push(p);
  }
  for (let i = 0; i < paragraphs.length; i++) {
    delete paragraphs[i].renderCache;
    Paragraph.cleanUpModifiers(paragraphs[i].modifiers, paragraphs[i].content.length);
  }
  return paragraphs;
}

interface InOrderChild {
  node: Node;
  skip: boolean;
}

export function inOrderChildren(dom: Node): [InOrderChild[], number] {
  const result: InOrderChild[] = [];
  let maxTextLength = 0;
  const root = dom;
  let node: Node = dom.childNodes[0];
  if (!node) {
    return [result, 0];
  }
  while (node !== null) {
    let skip = false;
    let renderSkip = false;
    if (isHTMLElement(node) && node.className && node.className.indexOf('widget') !== -1) {
      renderSkip = true;
    }
    const pNode = node.parentNode;
    if (pNode && isHTMLElement(pNode) && pNode.className && pNode.className.indexOf('widget') !== -1) {
      renderSkip = true;
    }
    if (!skip) {
      if (whiteList[node.nodeName]) {
        result.push({node: node, skip: renderSkip});
      } else if (isTextNode(node)) {
        let txt = node.textContent || '';
        txt = txt.replace(/[\n\r]/g, '');
        if (txt.length) {
          maxTextLength += txt.length;
          result.push({node: node, skip: renderSkip});
        }
      }
    }

    if (!skip && node.childNodes.length) {
      node = node.childNodes[0];
    } else {
      while (node.nextSibling === null && node.parentNode !== root) {
        node = node.parentNode!;
      }
      node = node.nextSibling!;
    }
  }
  return [result, maxTextLength];
}
const SpecialModifiers = Util.arrayToObj(['img', 'tar', 'tac', 'taj', 'nav', 'bullet', 'number', 'moved', 'layer', 'response']);
const InsertTags = Util.arrayToObj(['b', 'i', 'u', 's', 'sup', 'sub', 'a']);

// TODO: move to editorStyles or domClassManager
interface EditorStyle {
  className: string;
  style: StashOf<string>;
  overrideChildStyle: boolean;
}

// either a stash, e.g. tag.<userid>.EditorStyle
// or just direct: i.<EditorStyle>
type StyleClasses = StashOf<EditorStyle> | StashOf<StashOf<EditorStyle>>;

interface StyleData {
  authorID ?: string;
  layerID ?: string;
}

function insertModifiers(pDom: HTMLElement, para: Paragraph.Paragraph, content: string,
    styles: StyleClasses, mods: Paragraph.Modifier[], paraType: Paragraph.ParaType,
    width ?: number, isSnippet ?: boolean) {
  const modifiers = mods.slice(0);
  const originalLength = content.length;
  let s = 0;
  let parentOverrideStyle = {};

  let hasImage = false;
  for (let i = 0; i < modifiers.length; i++) {
    if (Paragraph.isImgMod(para.modifiers[i])) {
      hasImage = true;
      break;
    }
  }

  if (!paraType) {
    pDom.className = '';
  } else if (hasImage) {
    pDom.className = ' image ';
  } else {
    let styleHash;
    if (paraType === 'comment') {
      pDom.className = ' ' + paraType + ' ';
      styleHash = applyStyleToDom(pDom, styles, paraType, originalLength);
      if (!styleHash) {
        styleHash = applyStyleToDom(pDom, styles, paraType, originalLength);
      }
    } else if (s === 0 || (paraType !== 'paragraph')) {
      pDom.className = ' ' + paraType + ' ';
      styleHash = applyStyleToDom(pDom, styles, paraType, originalLength);
    } else {
      pDom.className = ' ' + paraType + 'mid ';
      let styleType: Paragraph.ParaType = paraType;
      // special case: a paragraph that is broken up gets its own style
      if (paraType === 'paragraph') {
        styleType = paraType + 'mid' as Paragraph.ParaType;
      }
      styleHash = applyStyleToDom(pDom, styles, styleType, originalLength);
    }
    Util.copyFields(styleHash, pDom.style);
  }

  if (!hasImage && para.tabLevel) {
    if (!styles.tabbed[para.tabLevel]) {
      Log.errorNoCtx('insertModifiers', 'undefined style for ' + para.tabLevel);
    } else {
      Util.copyFields(styles.tabbed[para.tabLevel].style, pDom.style);
      pDom.className += ' TAB' + para.tabLevel + ' ';
    }
  }

  if (!modifiers.length) {
    pDom.textContent = content;
    return;
  }
  let stack: Paragraph.Modifier[] = [], pos = 0;
  let node: Node = pDom;
  const parentOverrideStack: { style: StashOf<string>; end: number}[] = [];
  let curQuestionType = 'single-choice';

  for (let i = 0; i < modifiers.length; i++) {
    const mod = modifiers[i];
    if (mod.start >= originalLength) {
      // TODO: how do we log in bookUtil?
      continue;
    }
    if (SpecialModifiers[mod.type]) {
      let styleHash;
      switch (mod.type) {
        case 'tar':
          styleHash = applyStyleToDom(pDom, styles, mod.type, originalLength);
          break;
        case 'tac':
          styleHash = applyStyleToDom(pDom, styles, mod.type, originalLength);
          break;
        case 'taj':
          styleHash = applyStyleToDom(pDom, styles, mod.type, originalLength);
          break;
        case 'bullet':
          if (para.tabLevel) {
            const bullet = styles.bullet[para.tabLevel].style;
            Util.copyFields(bullet, pDom.style);
            pDom.className += ' BULLET ' + styles.bullet[para.tabLevel].className + ' ';
          }
          break;
        case 'number':
          if (Paragraph.isParaNumberModifier(mod) && styles.number[mod.data]) {
            const number = styles.number[mod.data].style;
            Util.copyFields(number, pDom.style);
            pDom.className += ' NUMBER' + mod.data + ' ' + styles.number[mod.data].className + ' ';
          }
          break;
        case 'moved': // deprecated
          styleHash = applyStyleToDom(pDom, styles, mod.type, mod.end, (mod as any).data);
          break;
        case 'layer':
          styleHash = applyStyleToDom(pDom, styles, mod.type, originalLength, (mod as any).data);
          break;
        case 'response':
          const response = styles.response[curQuestionType];
          Util.copyFields(response.style, pDom.style);
          pDom.className += ' TAB1 BULLET ' + response.className + ' ';
          break;
        default:
          // 'nav' appears to be deprecated
          if (mod.type as string === 'nav') {
            pDom.className += ' ' + (mod as any).data + ' ';
          }
          break;
      }
      if (styleHash) {
        Util.copyFields(styleHash, pDom.style);
      }
      continue;
    }
    if (mod.start > pos) {
      doIt(mod.start, styles);
    }
    if (mod.start === 0 && mod.start === mod.end) {
      continue;
    }
    node = addNode(node, styles, mod.type, mod.start, mod.end, mod['data'], width, isSnippet);
    // deprecated
    if (mod.type as string === 'link') {
      (node as HTMLAnchorElement).href = content.slice(mod.start, mod.end);
    }
    stack.push(mod);
  }
  doIt(content.length, styles);

  function calcParentOverrides(posStart ?: number) {
    if (posStart !== undefined) {
      for (let i = 0; i < parentOverrideStack.length; i++) {
        if (parentOverrideStack[i].end <= posStart) {
          parentOverrideStack.splice(i--, 1);
        }
      }
    }
    parentOverrideStyle = {};
    for (let i = 0; i < parentOverrideStack.length; i++) {
      for (const key in parentOverrideStack[i].style) {
        parentOverrideStyle[key] = parentOverrideStack[i].style[key];
      }
    }
  }

  function applyStyleToDom(pDomElt: HTMLElement, classes: StyleClasses,
      styleType: Paragraph.ModifierType | Paragraph.ParaType, end: number, data ?: string | StyleData) {
    let style;

    if (classes && classes[styleType]) {
      let sc = classes[styleType];
      let editorStyle: EditorStyle;
      if (data && typeof data === 'string' && sc[data]) {
        editorStyle = sc[data];
      } else if (data && typeof data === 'object' && sc[data.authorID!]) {
        editorStyle = sc[data.authorID!];
      } else if (data && typeof data === 'object' && sc[data.layerID!]) {
        editorStyle = sc[data.layerID!];
      } else if (sc['_unknown_']) {
        editorStyle = sc['_unknown_'];
      } else {
        editorStyle = sc as EditorStyle;
      }

      style = editorStyle.style;

      if (editorStyle.className) {
        pDomElt.className += ' ' + editorStyle.className + ' ';
      }

      if (editorStyle.overrideChildStyle) {
        parentOverrideStack.push({
          style: style,
          end: end,
        });
        calcParentOverrides();
      } else {
        style = Util.clone(style);
        for (const key in parentOverrideStyle) {
          style[key] = parentOverrideStyle[key];
        }
      }
    } else {
      style = {};
      Log.warnNoCtx('@unassigned', 'applyStyleToDom.unknownType', styleType);
    }

    return style;
  }

  function doIt(start: number, styleClasses: StyleClasses) {
    while (pos < start) {

      const posEnd = getPosEnd(pos);
      if (node.textContent || node.childNodes.length) {
        node = addNode(node, styleClasses, '#text', pos, posEnd);
      }
      node.textContent = content.substring(pos, posEnd);
      if (isHTMLAnchor(node)) {
        node.href = node.textContent!;
        node.target = '_blank';
      }
      restack(posEnd, styleClasses);
      pos = posEnd;
    }
  }

  function getPosEnd(start: number) {
    let max = content.length;
    for (let i = modifiers.length - 1; i >= 0; i--) {
      const mod = modifiers[i];
      if (mod.start <= start) {
        if (mod.end > start) {
          max = Math.min(max, mod.end);
        }
      } else {
        max = Math.min(max, mod.start);
      }
    }
    return max;
  }

  function restack(posEnd: number, styleClasses: StyleClasses) {
    node = pDom;
    let insert = 0;

    for (let i = 0; i < stack.length; i++) {
      const mod = stack[i];
      if (mod.end === posEnd) {
        stack.splice(i--, 1);
        insert = 1;
      } else {
        if (!insert && node.lastChild) {
          node = node.lastChild;
        } else {
          node = addNode(node, styleClasses, mod.type, posEnd, mod.end, (mod as any).data);
        }
      }
    }
  }

  function addNode(parent: Node, styleClasses: StyleClasses, type: Paragraph.ModifierType | '#text', start: number, end: number,
      data ?: any, layoutWidth ?: number, snippet ?: any) {
    calcParentOverrides(start);
    let newElement, widget, styleHash, key;
    let displayWidth;
    let displayHeight;
    if (type === '#text') {
      newElement = document.createTextNode('');
    } else if (type === Modifiers.IMG2 || (type === Modifiers.WIDGET && data && data.widget === WidgetTypes.IMG)) {
      if (data.id && data.h && data.w) {
        newElement = document.createElement('span');
        newElement.className = ' wdgtPlaceholder imgPlaceholder ' + data.url;
        styleHash = applyStyleToDom(pDom, styleClasses, type, end, data);
        for (key in styleHash) {
          newElement.style[key] = styleHash[key];
        }
        widget = document.createElement('div');
        displayWidth = data.w;
        displayHeight = data.h;
        if (layoutWidth && layoutWidth < displayWidth) {
          displayWidth = layoutWidth;
          displayHeight = displayWidth * data.h / data.w;
        }
        widget.style.width = displayWidth + 'px';
        widget.style.height = displayHeight + 'px';
        widget.overflow = 'hidden';
        widget.urlLookup = data.url;
        widget.className = ' widget  ' + data.url;
        widget.id = 'PH' + data.id;
        widget.style.backgroundImage = 'URL(' + data.url + ')';
        widget.style.backgroundSize = displayWidth + 'px ' + displayHeight + 'px';
        widget.className = 'widget noInvert';
        newElement.appendChild(widget);
        widget = document.createElement('span');
        widget.style.display = 'none';
        newElement.appendChild(widget);
        parent.appendChild(newElement);
        return widget;
      } else {
        return parent;
      }
    } else if (type === Modifiers.LOCATION || (type === Modifiers.WIDGET && data && data.widget === WidgetTypes.LOCATION)) {
      if (data.id) {
        newElement = document.createElement('span');
        newElement.className = ' wdgtPlaceholder locationPlaceholder ' + data.id;
        if (!snippet) {
          newElement.id = 'PH' + data.id;
        }
        newElement.style.marginLeft = '10px';
        newElement.style.marginRight = '10px';
        newElement.style.position = 'relative';
        newElement.style.overflow = 'hidden';
        styleHash = applyStyleToDom(pDom, styleClasses, type, end, data);
        for (key in styleHash) {
          newElement.style[key] = styleHash[key];
        }
        widget = document.createElement('span');
        widget.style.paddingLeft = '10px';
        widget.style.paddingRight = '10px';
        widget.textContent = data.title;
        widget.className = 'widget';
        newElement.appendChild(widget);
      } else {
        return parent;
      }
      parent.appendChild(newElement);
      return newElement;
    } else if (type === Modifiers.WIDGET && data && data.widget === WidgetTypes.EMOJI) {
      if (data.id) {
        newElement = document.createElement('span');
        newElement.className = ' emojiPlaceholder ' + data.id;
        styleHash = applyStyleToDom(pDom, styleClasses, 'emoji', end, data);
        for (key in styleHash) {
          newElement.style[key] = styleHash[key];
        }
        widget = document.createElement('span');
        displayWidth = 32;
        displayHeight = 32;
        widget.style.display = 'inline-block';
        widget.style.width = displayWidth + 'px';
        widget.className = ' emoji  ' + data.url;
        widget.id = 'PH' + data.id;
        widget.style.backgroundSize = displayWidth + 'px ' + displayHeight + 'px';
        newElement.appendChild(widget);
        widget = document.createElement('span');
        widget.style.display = 'none';
        newElement.appendChild(widget);
        parent.appendChild(newElement);
        return widget;
      } else {
        return parent;
      }
    } else if (type === Modifiers.QUESTION && data) {
      if (!data.id) {
        return parent;
      }

      newElement = document.createElement('span');
      newElement.className = ' questionPlaceholder ' + data.id;
      styleHash = applyStyleToDom(pDom, styleClasses, 'question', end, data);
      for (key in styleHash) {
        newElement.style[key] = styleHash[key];
      }
      widget = document.createElement('div');
      widget.className = ' question';
      widget.style.width = '100%';
      widget.style.height = '100%';
      widget.id = 'PH' + data.id;

      newElement.appendChild(widget);
      parent.appendChild(newElement);
      return widget;
    } else {
      if (InsertTags[type]) {
        newElement = document.createElement(type);
      } else {
        newElement = document.createElement('span');
      }
      newElement.className = ' ' + type + ' ';
      styleHash = applyStyleToDom(pDom, styleClasses, type, end, data);
      for (key in styleHash) {
        newElement.style[key] = styleHash[key];
      }
      parent.appendChild(newElement);
    }
    if (data) {
      if (typeof data === 'object') {
        newElement.className += ' ' + Util.safeStringify(data) + ' ';
        if (data.domID) {
          newElement.id = data.domID;
        }
      } else {
        newElement.className += ' ' + data + ' ';
      }

    }
    parent.appendChild(newElement);
    return newElement;
  }

}

function addExtraModifiersUnderDeletesChanges(mods: Paragraph.Modifier[]) {
  let i = mods.length;
  let stopChecking = i;
  while (i--) {
    switch (mods[i].type) {
      case Modifiers.UD:
      case Modifiers.UP:
      case Modifiers.AD:
      case Modifiers.AP:
      case Modifiers.AC:
      case Modifiers.UC:
        let j = stopChecking;
        const toInsertArray: Paragraph.Modifier[] = [];
        while (j--) {
          if (j === i) {
            continue;
          }
          if (mods[j].start >= mods[i].end) {
            continue;
          }
          switch (mods[j].type) {
            case Modifiers.AI:
            case Modifiers.UI:
              const modI = mods[i];
              const modJ = mods[j];
              if (isTCModifier(modI) && isTCModifier(modJ) && modI.data.authorID !== modJ.data.authorID) {
                if (mods[j].end >= mods[i].start && mods[j].start <= mods[i].end) {
                  const toInsert = Util.clone(mods[j]);
                  if (toInsert.end > mods[i].end) {
                    toInsert.end = mods[i].end;
                  }
                  if (toInsert.start < mods[i].start) {
                    toInsert.start = mods[i].start;
                  }
                  toInsertArray.push(toInsert);
                }
              }
              break;
          }
          if (mods[j].end <= mods[i].start) {
            break;
          }
        }
        stopChecking = i;
        j = toInsertArray.length;
        while (j--) {
          mods.splice(i + 1, 0, toInsertArray[j]);
        }
        break;
    }
  }
}

let gModifierWeights: StashOf<number>;
function sortModsForRender(p: Paragraph.Paragraph) {
  if (!gModifierWeights) {
    gModifierWeights = {};
    // ordered from least to most important (so will end up at end of modifier list to be painted last)
    // all of these are more important than mods not present
    const modPriorities = [
      Modifiers.LAYER,
      Modifiers.TAGCOMMENT,
      Modifiers.MENTION,
      Modifiers.SNIPPETHIGHLIGHT,
      Modifiers.TAG,
    ];
    for (let i = 0; i < modPriorities.length; i++) {
      const modType = modPriorities[i];
      gModifierWeights[modType] = i + 1;
    }
  }

  p.modifiers.sort(function(a, b) {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    if (gModifierWeights.hasOwnProperty(a.type) || gModifierWeights.hasOwnProperty(b.type)) {
      const wtA = gModifierWeights[a.type] || 0;
      const wtB = gModifierWeights[b.type] || 0;
      return wtA - wtB;
    }
    return Paragraph.cmpModifiers(a, b);
  });
}

function cleanupParagraph(para: Paragraph.Paragraph) {
  para.modifiers = para.modifiers || [];
  Paragraph.cleanUpModifiers(para.modifiers, para.content.length);
  // cory says: This is after cleanup so that we get extra modifiers just to properly manage delete attribution
  // be *very* careful adding modifiers after cleanup
  addExtraModifiersUnderDeletesChanges(para.modifiers);
  sortModsForRender(para);
}

function handleDeprecatedImage(div, para, i, layoutWidth, imgInfo) {
  // fix up broken urls at runtime
  const validInfo = typeof imgInfo !== 'string';
  const src = validInfo ? imgInfo.url : imgInfo;
  if (!src) {
    Log.errorNoCtx('@unassigned', 'buildDom.imgHasNoSource', {imgInfo: imgInfo, paraID: para.id, mod: para.modifiers[i]});
    return;
  }
  const validURL = src.indexOf('/media/');
  if (validURL < 0) {
    Log.warnNoCtx('@sam', 'invalid.img.url', { paraID: para.id, url: src });
    return;
  }

  const img = document.createElement('img');

  const imgHeight = validInfo ? imgInfo.h : 0;
  const imgWidth = validInfo ? imgInfo.w : 0;

  if (layoutWidth && imgHeight && imgWidth) {
    const displayWidth = Math.min(imgWidth, layoutWidth);
    const displayHeight = displayWidth * imgHeight / imgWidth;
    img.style.width = img.style.minWidth = img.style.maxWidth = displayWidth + 'px';
    img.style.height = img.style.minHeight = img.style.maxHeight = displayHeight + 'px';
  } else if (layoutWidth) {
    img.style.maxWidth = layoutWidth + 'px';
    img.style.maxHeight = layoutWidth + 'px';
    div.style.width = img.style.minWidth = img.style.maxWidth = layoutWidth + 'px';
    div.style.height = div.style.minHeight = div.style.maxHeight = layoutWidth + 'px';
  } else {
    img.style.maxWidth = '100%';
  }

  if (validURL === 0) {
    img.src = src;
    div.appendChild(img);
  } else {
    img.src = src.substr(validURL);
    div.insertBefore(img, div.childNodes[0]);
  }
}

export function buildDom(para, styleClasses, layoutWidth, isSnippet?: boolean) {
  para = Util.clone(para);
  const div = document.createElement('div');
  div.id = para.id;

  cleanupParagraph(para);
  insertModifiers(div, para, para.content, styleClasses, para.modifiers, Paragraph.getType(para), layoutWidth, isSnippet);

  // special case that inserts deprecated image after everything else in paragraph
  for (let i = 0; i < para.modifiers.length; i++) {
    switch (para.modifiers[i].type) {
      case Modifiers.IMG:
        handleDeprecatedImage(div, para, i, layoutWidth, para.modifiers[i].data);
        break;
    }
  }
  return div;
}

export function buildDomNoBackpointer(para, styleClasses) {
  const div = document.createElement('div');
  insertModifiers(div, para, para.content, styleClasses, para.modifiers, Paragraph.getType(para));
  return div;
}
