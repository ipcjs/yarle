import { yarleOptions } from "../../yarle";

export function generateHtmlContent(options: {
    title?: string;
    content?: string;
    metaTable: string;
}): string
export function generateHtmlContent(options: Record<string, any>) {
    // use __key__ placeholders in the template and replace them with the values from options
    return yarleOptions.currentHtmlTemplate.replace(/__(\w+)__/g, (match, key) => {
        if (options[key]) {
            return options[key];
        }
        return '';
    });
}