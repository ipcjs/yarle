import { yarleOptions } from './yarle';
import { NoteData } from './models/NoteData';
import { generateHtmlContent } from './utils';

export const convert2Html = (noteData: NoteData): void => {

  const m = noteData.originalContent.match(/<en-note(| [^>]*)>([\s\S]*)<\/en-note>/);
  if (!m) {
    return null;
  }
  // fix the path of the resource file to be a relative path based on the html file
  noteData.htmlContent = `<div${m[1]}>${noteData.htmlContent.replace(new RegExp(`<(a href|img src)="./${yarleOptions.resourcesDir}/`, 'g'), '<$1="./')}</div>`;

  let url = noteData.sourceUrl;
  if (url) {
    url = `<a href="${url}">${url.replace('&', '&amp;')}</a>`;
  }
  let tags = noteData.tags;
  if (tags) {
      tags = tags.split(' ').join(', ');
  }
  const trs = [
    ['Created', noteData.createdAt],
    ['Updated', noteData.updatedAt],
    ['Location', noteData.location],
    ['Source', url],
    ['Tags', tags],
  ].filter(r => r[1])
    .reduce((p, c) => `${p}\n<tr><th>${c[0]}:</th><td>${c[1]}</td></tr>`, '');

  noteData.htmlContent = generateHtmlContent({title: noteData.title, content: noteData.htmlContent, metaTable: trs});
  };
