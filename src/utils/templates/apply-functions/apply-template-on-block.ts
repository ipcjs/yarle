import { TemplateBlockSettings } from './../template-settings';
import * as M from './../match-all';

export const applyTemplateOnBlock = ({
  template,
  check,
  startBlockPlaceholder,
  endBlockPlaceholder,
  valuePlaceholder,
  value,
}: TemplateBlockSettings): string => {
  if (value && check()) {
    return template
      .replace(new RegExp(`${startBlockPlaceholder}`, 'g'), '')
      .replace(new RegExp(`${endBlockPlaceholder}`, 'g'), '')
      // `$` is specified char in replacement
      // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_the_replacement
      .replace(new RegExp(`${valuePlaceholder}`, 'g'), value.replaceAll('$', '$$$$'));
  }
  const reg = `${startBlockPlaceholder}([\\d\\D])(?:.|(\r\n|\r|\n))*?(?=${endBlockPlaceholder})${endBlockPlaceholder}`;

  return template.replace(
    new RegExp(reg,
      'g',
    ),
    '',
  );
};
