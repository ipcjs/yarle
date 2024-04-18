import marked, { Token as LinkToken } from 'marked';
import * as _ from 'lodash';

import { getUniqueId, normalizeFilenameString } from '../filename-utils';
import { OutputFormat } from '../../output-format';
import { yarleOptions } from '../../yarle';
import { getTurndownService } from '../turndown-service';
import { RuntimePropertiesSingleton } from '../../runtime-properties';

import { filterByNodeName } from './filter-by-nodename';
import { getAttributeProxy } from './get-attribute-proxy';
import { isTOC } from './../../utils/is-toc';
import { isHeptaOrObsidianOutput } from './../../utils/is-hepta-or-obsidian-output';

export const replaceBracketsForWikiLink = (str: string): string => {
    // Only a single bracket can exist in a wiki link.
    return str
        .replace(/\[+/g, '[')
        .replace(/\]+/g, ']')
        .replace(/\]$/, '] ')
}
export const replaceBackSlashes = (str: string): string => {
    return str.replace(/\\(.)/g, '$1');
};
const isEvernoteLink = (value: string): boolean => {
    let url;
    try {
        url = new URL(value);
    } catch (e) {
        return false;
    }
    // NOTE: URL automatically converts to lowercase
    if (url.protocol === 'evernote:') {
        // Internal link format: evernote:///view/92167309/s714/00ba720b-e3f1-49fd-9b43-5d915a3bca8a/00ba720b-e3f1-49fd-9b43-5d915a3bca8a/
        const pathSpl = url.pathname.split('/').filter(Boolean); // Split and removes empty strings
        if (pathSpl[0] !== 'view' || pathSpl.length < 4) return false;
        return true;
    } else if (!yarleOptions.keepEvernoteExternalLinks && (url.protocol === 'http:' || url.protocol === 'https:') && url.host === 'www.evernote.com') {
        // External link format: https://www.evernote.com/shard/s714/nl/92167309/00ba720b-e3f1-49fd-9b43-5d915a3bca8a/
        const pathSpl = url.pathname.split('/').filter(Boolean); // Removes empty strings
        if (pathSpl[0] !== 'shard' || pathSpl.length < 5) return false;
        return true;
    }
    return false;
}
const getEvernoteUniqueId = (value: string): string => {
    if (yarleOptions.keepEvernoteLinkIfNoNoteFound)
        return value;
    const urlSpl = value.split('/').reverse()
    return ((urlSpl[0] !== '')
        ? [urlSpl[0], urlSpl[1]]
        : [urlSpl[1], urlSpl[2]]).join('/')
}

export const wikiStyleLinksRule = {
    filter: filterByNodeName('A'),
    replacement: (content: any, node: HTMLElement) => {
        const nodeProxy = getAttributeProxy(node);
        let internalTurndownedContent = getTurndownService(yarleOptions).turndown(node.innerHTML);
        if (!nodeProxy.href) {
            return (node.innerHTML === '' || !node.innerHTML)
                ? ''
                : internalTurndownedContent;
        }

        // handle ObsidianMD internal link display name
        const omitObsidianLinksDisplayName = isHeptaOrObsidianOutput() && yarleOptions.obsidianSettings?.omitLinkDisplayName;
        const extension = yarleOptions.addExtensionToInternalLinks ? '.md' : '';

        let text = internalTurndownedContent;
        let headingPrefix = '';
        if (node.children.length) {
            // Handling complex link with other elements
            const lexer = new marked.Lexer({});
            const tokens = lexer.lex(internalTurndownedContent) as any;
            if (tokens.length > 0 && tokens[0]['type'] === 'heading') {
                text = tokens[0].text;
                headingPrefix = `${'#'.repeat(tokens[0]['depth'])} `;
            }
        }

        const buildWikiLink = (url: string, text?: string) => omitObsidianLinksDisplayName || !text || url === text
            ? `${headingPrefix}[[${url}${extension}]]`
            : `${headingPrefix}[[${url}${extension}|${text}]]`;

        const getShortLinkIfPossible = (url: string, text: string): string => (_.unescape(text) === _.unescape(url))
            ? yarleOptions.generateNakedUrls ? url : `<${url}>`
            : !text
                ? '' // Remove links that don't contain text.
                : `${headingPrefix}[${text}](${url})`;

        const url: string = nodeProxy.href ? nodeProxy.href.value : internalTurndownedContent;
        const realUrl = yarleOptions.urlEncodeFileNamesAndLinks ? encodeURI(url) : url;

        const type = nodeProxy.type ? nodeProxy.type.value : undefined;
        const isYarleResource = Boolean(node.getAttribute('yarle-file-resource'))
        if (type === 'file' || isYarleResource) {
            return isHeptaOrObsidianOutput()
                ? `![[${realUrl}]]`
                : getShortLinkIfPossible(url, text);
        }

        if (isEvernoteLink(url)) {
            const fileName = normalizeFilenameString(replaceBackSlashes(text));
            const noteIdNameMap = RuntimePropertiesSingleton.getInstance();
            const uniqueEnd = getUniqueId();
            const id = getEvernoteUniqueId(url)
            if (isTOC(noteIdNameMap.getCurrentNoteName())) {
                noteIdNameMap.addItemToTOCMap({ id, url, title: fileName, uniqueEnd });
            } else {
                noteIdNameMap.addItemToMap({ id, url, title: fileName, uniqueEnd });
            }

            const linkedNoteId = id; // todo add evernotelink value
            if (yarleOptions.keepEvernoteLinkIfNoNoteFound) {
                return `<YARLE_EVERNOTE_LINK>${buildWikiLink(linkedNoteId, fileName)}<-->[${text}](${linkedNoteId}${extension})</YARLE_EVERNOTE_LINK>`
            }
            if (isHeptaOrObsidianOutput()) {
                return buildWikiLink(linkedNoteId, text);
            }
            return `${headingPrefix}[${text}](${linkedNoteId}${extension})`;
        }

        if (url.match(/^(https?:|tel:|www\.|file:|busycalevent:|ftp:|mailto:)/)) {
            return getShortLinkIfPossible(url, text);
        }

        return (isHeptaOrObsidianOutput())
            ? buildWikiLink(realUrl, text)
            : (yarleOptions.outputFormat === OutputFormat.StandardMD || yarleOptions.outputFormat === OutputFormat.LogSeqMD)
                ? `${headingPrefix}[${text}](${realUrl})`
                : buildWikiLink(realUrl);
    },
};

