import { escapeStringRegexp } from "./utils";

export interface CharacterMap {
    [key: string]: string;
}

export const CharacterMap = {
    apply(characterMap: CharacterMap, title: string): string {
        let appliedTitle = title;
        try {
            for (const key of Object.keys(characterMap)) {
                const replacement = characterMap[key as any];
                const regex: RegExp = new RegExp(escapeStringRegexp(key), 'g');
                appliedTitle = appliedTitle.replace(regex, replacement);
            }
        } catch (e) {
            console.log(e);
        }
        return appliedTitle;
    },
    applySafely(characterMap: CharacterMap, title: string): string {
        return this.apply(characterMap, title).replace(/[/\\?%*:|"<>\[\]\+]/g, '-');
    }
}