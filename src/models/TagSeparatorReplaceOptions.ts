import { CharacterMap } from "CharacterMap";

export interface TagSeparatorReplaceOptions {
    characterMap?: CharacterMap;
    separatorInEN: string;
    replaceSeparatorWith: string;
    replaceSpaceWith?: string;
}
