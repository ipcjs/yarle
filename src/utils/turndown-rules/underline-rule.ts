import { OutputFormat } from '../../output-format';
import { yarleOptions } from '../../yarle';

// Note: this rule must appear *after* use(gfm) so it can override
// turndown-plugin-gfm rule for strikethrough (which always uses single '~')
export const underlineRule = {
  filter: ['u'],
  replacement: (content: any, node: HTMLElement, options: any) => {
    if (yarleOptions.outputFormat === OutputFormat.ObsidianMD &&
      node.childNodes.length === 1 && node.childNodes[0].nodeName === 'A') {
      // In obsidian's preview mode, the underline displays abnormally when it contains a link, so the underline is removed.
      return content
    }
    return `<u>${content}</u>`
  },
};
