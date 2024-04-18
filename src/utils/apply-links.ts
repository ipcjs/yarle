/* istanbul ignore file */
// tslint:disable:no-console
import * as fs from 'fs';
import * as path from 'path';

import { YarleOptions } from './../YarleOptions';
import { RuntimePropertiesSingleton } from './../runtime-properties';
import { truncatFileName } from './folder-utils';
import { escapeStringRegexp } from './escape-string-regexp';
import { getAllOutputFilesWithExtension } from './get-all-output-files';
import { isTanaOutput } from './tana/is-tana-output';
import { updateFileContentSafely } from './file-utils';
import { getClosestFileName, normalizeFilenameString } from './filename-utils';
import { LanguageFactory } from './../outputLanguages/LanguageFactory';
import { OutputFormat } from './../output-format';
import { isTOC } from './is-toc';
import { replaceBackSlashes, replaceBracketsForWikiLink } from './turndown-rules';

export const applyLinks = (options: YarleOptions, outputNotebookFolders: Array<string>): void => {
    const linkNameMap = RuntimePropertiesSingleton.getInstance();
    const allLinks = linkNameMap.getAllNoteIdNameMap();
    const allconvertedFiles: Array<string> = [];
    for (const outputFolder of outputNotebookFolders) {
        getAllOutputFilesWithExtension(outputFolder, allconvertedFiles, undefined);
    }
    for (const [linkName, linkProps] of Object.entries(allLinks)) {
        const uniqueId = linkProps.uniqueEnd;
        let fileName = linkProps.title;
        if (allconvertedFiles.find(fn => fn.includes(uniqueId))) {
            fileName = truncatFileName(fileName, uniqueId);
        }
        if (options.useLevenshteinForLinks) {
            const fileNames = allconvertedFiles.map(convertedFileName => {
                return convertedFileName.split(path.sep).reverse()[0].split('.')[0]
            })
            fileName = getClosestFileName(fileName, fileNames);
        }
        const notebookName: string = linkProps.notebookName;
        const encodedFileName = options.urlEncodeFileNamesAndLinks ? encodeURI(fileName) : fileName;
        let linkDoesntExist = !allconvertedFiles.find(convertedFile => convertedFile.endsWith(`${encodedFileName}.md`));

        for (const notebookFolder of outputNotebookFolders) {
            let realFileName = encodedFileName;
            let realFileNameInContent = encodedFileName;
            if (notebookName && (!notebookFolder.endsWith(notebookName) || options.outputFormat === OutputFormat.LogSeqMD)) {
                realFileName = `${notebookName}${encodedFileName}`;
                // Ensure use `/` as separator
                realFileNameInContent = `${notebookName.replace(/\\/g, '/')}/${encodedFileName}`;
            }
            const filesInOutputDir = fs.readdirSync(notebookFolder);
            console.log(`Files in output dir: ${JSON.stringify(filesInOutputDir)}`);
            console.log(`notebookFolder: ${notebookFolder}`);
            console.log(`realFileName: ${realFileName}`);

            const langaugeFactory = new LanguageFactory();
            const targetLanguage = langaugeFactory.createLanguage(options.outputFormat)
            const extension = targetLanguage.noteExtension;

            const targetFiles = filesInOutputDir.filter(file => {
                return path.extname(file).toLowerCase() === extension;
            });
            for (const targetFile of targetFiles) {
                const fileContent = fs.readFileSync(`${notebookFolder}${path.sep}${targetFile}`, 'UTF-8');
                let updatedContent = fileContent;
                if (isTanaOutput()) {
                    const tanaNote = JSON.parse(updatedContent)
                    const linkedNode = tanaNote.nodes?.find((note: any) => note.name === realFileNameInContent)
                    if (linkedNode) {
                        const linkItem = linkNameMap.getNoteIdNameMapByNoteTitle(realFileNameInContent)
                        linkedNode.uid = linkItem[0].uniqueEnd
                        updatedContent = JSON.stringify(tanaNote)
                    }

                }
                if (options.keepEvernoteLinkIfNoNoteFound) {
                    if (linkDoesntExist) {
                        const regexp = new RegExp(`<YARLE_EVERNOTE_LINK>(.)*<-->`)// replace
                        updatedContent = updatedContent.replace(regexp, '');
                        updatedContent = updatedContent.replace('</YARLE_EVERNOTE_LINK>', '');

                    } else {
                        const regexp = new RegExp(`<-->(.)*<\/YARLE_EVERNOTE_LINK>`)// replace
                        updatedContent = updatedContent.replace(regexp, '');
                        updatedContent = updatedContent.replace('<YARLE_EVERNOTE_LINK>', '');
                    }
                } else {
                    const escapedLinkName = escapeStringRegexp(linkName)
                    const regexp = new RegExp(`${escapedLinkName}|\\[\\[(${escapedLinkName})(\\.md)?(\\\\?\\|)(.*?(\\\\])?)\\]\\]`, 'g');
                    updatedContent = updatedContent.replace(regexp, (str, url, ext = '', sep, text) => {
                        if (text) {
                            // Convert `text` to `_encodedFileName`. If it equals `realFileNameInContent`, we can use a shorter wiki link.
                            const _fileName = normalizeFilenameString(replaceBackSlashes(text));
                            const _encodedFileName = options.urlEncodeFileNamesAndLinks ? encodeURI(_fileName) : _fileName;
                            if (_encodedFileName === realFileNameInContent) {
                                return `[[${realFileNameInContent}${ext}]]`
                            }
                            const normalizedText = _encodedFileName === encodedFileName
                                ? _encodedFileName
                                : replaceBracketsForWikiLink(replaceBackSlashes(text))
                            return `[[${realFileNameInContent}${ext}${sep}${normalizedText}]]`
                        }
                        return realFileNameInContent;
                    });
                }

                if ((`${fileName}.md` === targetFile || targetFile === linkProps.title)
                    && isTOC(linkProps.noteName)
                    && (notebookFolder.endsWith(notebookName) || options.outputFormat === OutputFormat.LogSeqMD)) {
                    // TODO APPLY EVERNOTE LINK 
                    const evernoteInternalLinkPlaceholderRegExp = new RegExp('<YARLE_EVERNOTE_LINK_PLACEHOLDER>', 'g');
                    updatedContent = updatedContent.replace(evernoteInternalLinkPlaceholderRegExp, linkProps.url);

                    // TODO APPLY EVERNOTE GUID 
                    const evernoteGuidPlaceholderRegExp = new RegExp('<YARLE_EVERNOTE_GUID_PLACEHOLDER>', 'g');
                    updatedContent = updatedContent.replace(evernoteGuidPlaceholderRegExp, linkProps.guid);
                }
                if (fileContent !== updatedContent) {
                    const filePath = `${notebookFolder}${path.sep}${targetFile}`;
                    updateFileContentSafely(filePath, updatedContent);
                }
            }
        }
    }
    const unrecognizable = "Unrecognizable";

    for (const targetFile of allconvertedFiles) {
        const fileContent = fs.readFileSync(targetFile, 'UTF-8');

        // TODO APPLY EVERNOTE LINK 
        const evernoteInternalLinkPlaceholderRegExp = new RegExp('<YARLE_EVERNOTE_LINK_PLACEHOLDER>', 'g');
        let updatedContent = fileContent.replace(evernoteInternalLinkPlaceholderRegExp, unrecognizable);

        // TODO APPLY EVERNOTE GUID 
        const evernoteGuidPlaceholderRegExp = new RegExp('<YARLE_EVERNOTE_GUID_PLACEHOLDER>', 'g');
        updatedContent = updatedContent.replace(evernoteGuidPlaceholderRegExp, unrecognizable);

        if (fileContent !== updatedContent) {
            updateFileContentSafely(targetFile, updatedContent);
        }
    }
};

