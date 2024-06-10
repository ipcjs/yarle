import { yarleOptions } from '../../yarle';

import { filterByNodeName } from './filter-by-nodename';
import { getAttributeProxy } from './get-attribute-proxy';
import { OutputFormat } from './../../output-format';
import { isHeptaOrObsidianOutput } from './../is-hepta-or-obsidian-output';
import { ImageSizeFormat } from './../../image-size-format';

export const imagesRule = {
  filter: filterByNodeName('IMG'),
  replacement: (content: any, node: any) => {
    const nodeProxy = getAttributeProxy(node);

    if (!nodeProxy.src) {
      return '';
    }
    const value: string = nodeProxy.src.value;
    const text: string = nodeProxy.alt?.value || value.split('/').reverse()[0] || ''
    const widthParam = node.width || nodeProxy.width?.value?.replace('px', '') || '';
    const heightParam = node.height || nodeProxy.height?.value?.replace('px', '') || '';
    let realValue = value;
    if (yarleOptions.sanitizeResourceNameSpaces) {
      realValue = realValue.replace(/ /g, yarleOptions.replacementChar);
    } else if (yarleOptions.urlEncodeFileNamesAndLinks) {
      realValue = encodeURI(realValue);
    }
    if (yarleOptions.keepImageSize){
      let sizeString = (widthParam || heightParam) ? ` =${widthParam}x${heightParam}` : '';

      // while this isn't really a standard, it is common enough
      if (yarleOptions.imageSizeFormat === ImageSizeFormat.StandardMD) {

        return `![](${realValue}${sizeString})`;
      } else if (yarleOptions.imageSizeFormat === ImageSizeFormat.ObsidianMD) {
        sizeString = (widthParam || heightParam) ? `|${widthParam || 0}x${heightParam || 0}` : '';
        if (realValue.startsWith('./') || realValue.startsWith('..')) {
          return `![[${realValue}${sizeString}]]`;
        } else {
          return `![${text}${sizeString}](${realValue})`;
        }
      }
    }
    const useObsidianMD = isHeptaOrObsidianOutput();
    if (useObsidianMD && !value.match(/^[a-z]+:/)) {
      return `![[${realValue}]]`;
    }

    return `![${text}](${realValue})`;
  },
};
