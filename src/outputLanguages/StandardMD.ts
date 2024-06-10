import { cloneDeep } from "lodash";
import { EvernoteNoteData, NoteData } from "./../models/NoteData";
import { saveMdFile } from "./../utils";
import { YarleOptions } from "./../YarleOptions";
import { Language } from "./language";

export class StandardMD implements Language {
    constructor(){}

    languageItems =  {
        bold: '**',
        italic: '_',
        highlight: '`',
        strikethrough: '~~', 
        listItem: '* '
    };
    codeBlock = '\n```\n';

    postProcess= async(options: YarleOptions, outputNotebookFolders: string[]) => {};
    noteExtension= '.md';
    noteProcess= (options: YarleOptions, noteData: NoteData, note: EvernoteNoteData)  => {
        saveMdFile(fixImagesInLink(noteData.appliedMarkdownContent), noteData, note)
    };
    tagProcess= (content: string, tasks: Map<string, string>, currentTaskPlaceholder: string, updatedContent: string): string => {
        return updatedContent;
    }

}


const fixImagesInLink = (content: string): string => {
    // Regular expression for the whole string with two groups
    const patternWholeString = /\[!\[\[(.*?)(?:\|(.*?))?\]\]\]\((.*?)\)/g;
    return content.replace(patternWholeString, (str, imgLink, dimensions = '', link) => {
        return `[![${dimensions}](${imgLink})](${link})`
    })
}