
import { yarleOptions } from '../../yarle';
import { OutputFormat } from '../../output-format';

import { filterByNodeName } from './filter-by-nodename';
import { getAttributeProxy } from './get-attribute-proxy';
import { getLanguageItems } from './../../outputLanguages/LanguageFactory';

const EVERNOTE_HIGHLIGHT = '-evernote-highlight:true;';
const EVERNOTE_COLORHIGHLIGHT = '--en-highlight';
const BOLD = 'bold';
const ITALIC = 'italic';

const LINE_THROUGH = 'line-through';
export function hasLineThroughStyle(node: HTMLElement) {
    return node.style.textDecoration?.includes(LINE_THROUGH) || node.style.textDecorationLine?.includes(LINE_THROUGH)
}

export const spanRule = {
    filter: filterByNodeName('SPAN'),
    replacement: (content: string, node: HTMLSpanElement) => {

        //const HIGHLIGHT_SEPARATOR = yarleOptions.outputFormat === OutputFormat.ObsidianMD ? '==' : '`' ;
        const nodeProxy = getAttributeProxy(node);
        if (nodeProxy.style && content.trim() !== '') {
            const nodeValue: string = nodeProxy.style.value;
            const languageItems = getLanguageItems(yarleOptions.outputFormat)

            // this aims to care for bold text generated as <span style="font-weight: bold;">Bold</span>
            if (content !== '<YARLE_NEWLINE_PLACEHOLDER>') {
                const hasBold = nodeValue.includes(BOLD);
                const hasItalic = nodeValue.includes(ITALIC);
                const hasStrike = hasLineThroughStyle(node)
                let styledContext = content
                if (hasBold) {
                    styledContext = `${languageItems.bold}${styledContext}${languageItems.bold}`;
                }
                if (hasItalic) {
                    styledContext = `${languageItems.italic}${styledContext}${languageItems.italic}`;
                }
                if (hasStrike) {
                    styledContext = `${languageItems.strikethrough}${styledContext}${languageItems.strikethrough}`
                }
                if (styledContext !== content) {
                    return styledContext
                }
            }
            const match = nodeValue.match(/color:rgb\(\d{0,3}, \d{0,3}, \d{0,3}\);|background-color: #([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|--en-fontfamily:[^"]*/)

            return nodeValue.includes(EVERNOTE_HIGHLIGHT) ||
                nodeValue.includes(EVERNOTE_COLORHIGHLIGHT) ||
                (yarleOptions.convertColorsToMDHighlight && match) ?
                `${languageItems.highlight}${content}${languageItems.highlight}` :
                content;
        }

        return content;
    },
};
