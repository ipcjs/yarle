import { OutputFormat } from '../../output-format';
import { yarleOptions } from '../../yarle';
import { getLanguageItems } from './../../outputLanguages/LanguageFactory';

import { getAttributeProxy } from './get-attribute-proxy';
import { checkboxDone, checkboxTodo } from './../../constants';
export const taskListRule = {
    filter: 'li',
    replacement: (content: string, node: HTMLLIElement, options: any) => {

        const isTodoDoneBlock = (node: any)  => {
            const nodeProxy = getAttributeProxy(node);
            const taskFlag = '--en-checked:true;';

            return nodeProxy.style && nodeProxy.style.value.indexOf(taskFlag) >= 0;
        };
        const isTodoBlock = (node: any)  => {
            const nodeProxy = getAttributeProxy(node);
            const taskFlag = '--en-checked:false;';

            return nodeProxy.style && nodeProxy.style.value.indexOf(taskFlag) >= 0;
        };

        const indentCount  = content.match(/^\n*/)[0].length || 0;
        const indentChars = yarleOptions.indentCharacter.repeat(indentCount);

        const todoPrefix = yarleOptions.outputFormat === OutputFormat.LogSeqMD ? '' :
        node.parentElement?.nodeName?.toUpperCase() === 'LI' ? '' : `${indentChars}- `;


        const singleLineContent = content
            .replace(/^\n+/, '') // Remove leading newlines
            .replace(/\n+$/, '\n') // Replace trailing newlines with just a single one
            .replace(/\n/gm, `\n${yarleOptions.indentCharacter}`); // Indent
        const languageItems = getLanguageItems(yarleOptions.outputFormat);

        let prefix =  indentCount > 0
            ? indentChars
            : (isTodoDoneBlock(node)
                ? `${checkboxDone} `
                : (isTodoBlock(node)
                    ? `${checkboxTodo} `
                    : languageItems.listItem))
                    ;
        const parent = node.parentNode;
        if (parent.nodeName === 'OL') {
            const start = (parent as HTMLOListElement).getAttribute('start');
            const index = Array.prototype.indexOf.call(parent.children, node);
            prefix = `${(start ? Number(start) + index : index + 1)}. `;
        }

        let ret;

        ret = (prefix + singleLineContent + (node.nextSibling && !/\n$/.test(singleLineContent) ? '\n' : ''));

        return ret;
}};
