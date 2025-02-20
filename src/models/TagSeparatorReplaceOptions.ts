import { CharacterMap } from "../CharacterMap";
import type { YarleOptions } from "../YarleOptions";

export interface TagSeparatorReplaceOptions {
    /**
     * If this option is set, the following options will not take effect:
     * - {@link separatorInEN}
     * - {@link replaceSeparatorWith}
     * - {@link replaceSpaceWith}
     * - {@link YarleOptions.removeUnicodeCharsFromTags}
     */
    characterMap?: CharacterMap;
    separatorInEN: string;
    replaceSeparatorWith: string;
    replaceSpaceWith?: string;
}
